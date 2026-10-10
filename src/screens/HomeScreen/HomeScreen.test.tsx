import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { withLapRecord } from '@/core/Profiles';
import type { ProfileDraft } from '@/core/Profiles';
import { reloadPlayerPreferences } from '@/hooks/usePlayerPreferences';
import {
  createPlayerProfile,
  deletePlayerProfile,
  readProfiles,
  reloadProfiles,
  updateProfiles,
} from '@/hooks/useProfiles';

import { HomeScreen } from './HomeScreen';
import { COLORS } from './HomeScreen.styles';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() };
jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    useRouter: () => mockRouter,
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
  };
});

const storage = Storage as unknown as { __reset: () => void };

const LAGO = 'autodromo-del-lago';

async function createActive(draft: Partial<ProfileDraft> = {}) {
  let id = '';
  await act(() => {
    const result = createPlayerProfile({ name: 'Male', colorId: 'pink', number: 27, ...draft });
    id = result.ok ? result.profile.id : '';
  });
  return id;
}

const paintedWith = (color: string) =>
  screen.container.queryAll((node) => node.type === 'Path' && node.props.color === color);

describe('HomeScreen', () => {
  let profileId = '';

  beforeEach(async () => {
    storage.__reset();
    jest.clearAllMocks();
    await act(() => {
      reloadPlayerPreferences();
      reloadProfiles();
    });
    profileId = await createActive();
  });

  it('muestra el logo, el modo de juego y el botón Correr', async () => {
    await render(<HomeScreen />);
    expect(screen.getByRole('header', { name: 'Vuelta Rápida' })).toBeTruthy();
    expect(screen.getByText('Contrarreloj · 3 vueltas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Correr' })).toBeTruthy();
  });

  it('Correr va a la pista', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Correr' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/pista');
  });

  it('muestra el récord del jugador activo', async () => {
    await act(() => updateProfiles((state) => withLapRecord(state, profileId, LAGO, 72480, 1)!));
    await render(<HomeScreen />);
    expect(screen.getByTestId('home-record')).toHaveTextContent(
      'Tu récord en Autódromo del Lago1:12.480',
    );
  });

  it('sin récord lo dice, aunque otro jugador tenga uno', async () => {
    await act(() => updateProfiles((state) => withLapRecord(state, profileId, LAGO, 72480, 1)!));
    await createActive({ name: 'Tomi' });
    await render(<HomeScreen />);
    expect(screen.getByTestId('home-record')).toHaveTextContent(
      'Todavía sin récord en Autódromo del Lago',
    );
  });

  it('dibuja el auto con el color y el número del jugador (decorativo)', async () => {
    await render(<HomeScreen />);
    expect(screen.getByTestId('home-car', { includeHiddenElements: true })).toBeTruthy();
    expect(paintedWith('#F164AF').length).toBeGreaterThan(0);
    const [number] = screen.container.queryAll((node) => node.type === 'SkiaText');
    expect(number.props.text).toBe('27');
    expect(screen.getByTestId('home-number', { includeHiddenElements: true })).toHaveTextContent(
      '27',
    );
  });

  it('el auto azul se dibuja blanco sobre el panel azul', async () => {
    await createActive({ name: 'Tomi', colorId: 'blue' });
    await render(<HomeScreen />);
    expect(paintedWith(COLORS.carOnBlue).length).toBeGreaterThan(0);
    expect(paintedWith('#2F6BDD')).toHaveLength(0);
  });

  it('la píldora del piloto vuelve a "¿Quién juega?"', async () => {
    await render(<HomeScreen />);
    const driver = screen.getByRole('button', { name: 'MALE, número 27. Cambiar piloto' });
    expect(driver).toHaveTextContent('27MALECambiar');
    await fireEvent.press(driver);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/jugadores');
  });

  it('Garage edita el perfil activo', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByTestId('home-garage'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/piloto',
      params: { id: profileId },
    });
  });

  it('sin jugador activo va a "¿Quién juega?"', async () => {
    await act(() => deletePlayerProfile(profileId));
    expect(readProfiles().activeProfileId).toBeNull();
    await render(<HomeScreen />);
    expect(screen.getByText('redirect:/jugadores')).toBeTruthy();
  });
});
