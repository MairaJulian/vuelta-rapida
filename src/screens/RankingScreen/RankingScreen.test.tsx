import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { withLapRecord, withRaceRecord } from '@/core/Profiles';
import type { ProfileDraft } from '@/core/Profiles';
import { LAP_TABLE, raceTable } from '@/core/Ranking';
import {
  createPlayerProfile,
  deletePlayerProfile,
  reloadProfiles,
  selectPlayerProfile,
  updateProfiles,
} from '@/hooks/useProfiles';

import { getTableOptions, RankingScreen, toTable } from './RankingScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParams: { circuito?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const storage = Storage as unknown as { __reset: () => void };

const LAGO = 'autodromo-del-lago';

function create(draft: ProfileDraft) {
  const result = createPlayerProfile(draft);
  return result.ok ? result.profile.id : '';
}

const towerTexts = () =>
  screen.getAllByTestId(/^timing-row-\d+$/).map((row) => row.props.accessibilityLabel as string);

describe('toTable y getTableOptions', () => {
  it('pasa la opción del selector a la tabla', () => {
    expect(toTable('lap')).toEqual(LAP_TABLE);
    expect(toTable('race-5')).toEqual(raceTable(5));
  });

  it('ofrece la mejor vuelta y una carrera por cantidad de vueltas, siempre con la de 3', () => {
    expect(getTableOptions([]).map((option) => option.label)).toEqual([
      'Mejor vuelta',
      'Carrera · 3 vueltas',
    ]);
    expect(getTableOptions([5, 1]).map((option) => option.value)).toEqual([
      'lap',
      'race-1',
      'race-3',
      'race-5',
    ]);
  });
});

describe('RankingScreen', () => {
  let male = '';
  let tomi = '';

  beforeEach(async () => {
    storage.__reset();
    jest.clearAllMocks();
    mockParams = {};
    await act(() => {
      reloadProfiles();
      tomi = create({ name: 'Tomi', colorId: 'teal', number: 7 });
      male = create({ name: 'Male', colorId: 'pink', number: 27 }); // activo
      create({ name: 'Luli', colorId: 'orange', number: 14 });
      selectPlayerProfile(male);
      updateProfiles((state) => {
        let next = withLapRecord(state, tomi, LAGO, 70000, 1)!;
        next = withLapRecord(next, male, LAGO, 70345, 2)!;
        next = withRaceRecord(next, male, LAGO, 3, 200000, 3)!;
        return withRaceRecord(next, tomi, LAGO, 5, 330000, 4)!;
      });
    });
  });

  it('abre en la mejor vuelta de la primera pista', async () => {
    await render(<RankingScreen />);
    expect(screen.getByRole('header')).toHaveTextContent('Ranking');
    expect(screen.getByText('Autódromo del Lago · Mejor vuelta')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Mejor vuelta' })).toHaveProp('accessibilityState', {
      checked: true,
    });
  });

  it('torre de tiempos: el líder con su tiempo y el resto con la diferencia', async () => {
    await render(<RankingScreen />);
    expect(towerTexts()).toEqual([
      '1.º TOMI, número 7, 1:10.000',
      '2.º MALE, número 27, +0.345, vos',
    ]);
  });

  it('cada fila lleva la barra del color del perfil y el activo va resaltado', async () => {
    await render(<RankingScreen />);
    const [first, second] = screen.getAllByTestId('timing-row-bar');
    expect(first).toHaveStyle({ backgroundColor: '#00BEB7' });
    expect(second).toHaveStyle({ backgroundColor: '#F164AF' });
    expect(screen.getByTestId('timing-row-2')).toHaveStyle({ backgroundColor: '#E9EFFC' });
    expect(screen.getByTestId('timing-row-1')).toHaveStyle({ backgroundColor: '#FFFFFF' });
  });

  it('las tablas de carrera se separan por cantidad de vueltas', async () => {
    await render(<RankingScreen />);
    expect(screen.getByRole('radio', { name: 'Carrera · 5 vueltas' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Carrera · 3 vueltas' }));
    expect(screen.getByText('Autódromo del Lago · Carrera · 3 vueltas')).toBeTruthy();
    expect(towerTexts()).toEqual(['1.º MALE, número 27, 3:20.000, vos']);
    await fireEvent.press(screen.getByRole('radio', { name: 'Carrera · 5 vueltas' }));
    expect(towerTexts()).toEqual(['1.º TOMI, número 7, 5:30.000']);
  });

  it('una tabla vacía lo dice', async () => {
    await act(() => {
      updateProfiles((state) => ({ ...state, lapRecords: [] }));
    });
    await render(<RankingScreen />);
    expect(screen.getByText('Todavía no hay tiempos en esta tabla.')).toBeTruthy();
  });

  it('si se borra un perfil, sale de la torre', async () => {
    await act(() => deletePlayerProfile(tomi));
    await render(<RankingScreen />);
    expect(towerTexts()).toEqual(['1.º MALE, número 27, 1:10.345, vos']);
  });

  it('abre en la pista que llega en la ruta', async () => {
    mockParams = { circuito: LAGO };
    await render(<RankingScreen />);
    expect(screen.getByRole('radio', { name: 'Autódromo del Lago' })).toHaveProp(
      'accessibilityState',
      { checked: true },
    );
  });

  it('Volver regresa', async () => {
    await render(<RankingScreen />);
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
