import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { withLapRecord } from '@/core/Profiles';
import type { ProfileDraft } from '@/core/Profiles';
import {
  createPlayerProfile,
  readProfiles,
  reloadProfiles,
  updateProfiles,
} from '@/hooks/useProfiles';

import { PlayerSelectScreen } from './PlayerSelectScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const storage = Storage as unknown as { __reset: () => void };

const LAGO = 'autodromo-del-lago';

async function create(draft: ProfileDraft) {
  let id = '';
  await act(() => {
    const result = createPlayerProfile(draft);
    id = result.ok ? result.profile.id : '';
  });
  return id;
}

describe('PlayerSelectScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    jest.clearAllMocks();
    await act(() => reloadProfiles());
  });

  describe('sin perfiles', () => {
    it('invita a crear el primer piloto', async () => {
      await render(<PlayerSelectScreen />);
      expect(screen.getByRole('header')).toHaveTextContent('¿Quién juega?');
      expect(screen.getByText('Creá tu piloto para guardar tus tiempos')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Nuevo piloto' })).toBeTruthy();
      expect(screen.queryByLabelText('Volver')).toBeNull();
    });

    it('"Nuevo piloto" abre la personalización', async () => {
      await render(<PlayerSelectScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Nuevo piloto' }));
      expect(mockRouter.push).toHaveBeenCalledWith('/piloto');
    });
  });

  describe('con perfiles', () => {
    let male = '';
    let tomi = '';

    beforeEach(async () => {
      male = await create({ name: 'Male', colorId: 'pink', number: 27 });
      tomi = await create({ name: 'Tomi', colorId: 'teal', number: 7 });
      await act(() => updateProfiles((state) => withLapRecord(state, male, LAGO, 72480, 1)!));
    });

    it('muestra una tarjeta por perfil, con nombre, número y récord, y "Nuevo piloto"', async () => {
      await render(<PlayerSelectScreen />);
      expect(screen.getByText('Tocá tu piloto para correr')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'MALE, número 27. Récord 1:12.480' })).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'TOMI, número 7. Sin récord todavía' }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Nuevo piloto' })).toBeTruthy();
    });

    it('con un solo perfil igual se muestra, con la opción de crear otro', async () => {
      storage.__reset();
      await act(() => reloadProfiles());
      await create({ name: 'Male', colorId: 'pink', number: 27 });
      await render(<PlayerSelectScreen />);
      expect(screen.getByTestId(/^profile-card-/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Nuevo piloto' })).toBeTruthy();
    });

    it('el último en jugar tiene el borde azul', async () => {
      await render(<PlayerSelectScreen />);
      expect(screen.getByTestId(`profile-card-${tomi}`)).toHaveStyle({ borderColor: '#2F6BDD' });
      expect(screen.getByTestId(`profile-card-${male}`)).toHaveStyle({
        borderColor: 'transparent',
      });
    });

    it('tocar una tarjeta elige al jugador y va a Inicio', async () => {
      await render(<PlayerSelectScreen />);
      await fireEvent.press(screen.getByTestId(`profile-card-${male}`));
      expect(readProfiles().activeProfileId).toBe(male);
      expect(mockRouter.push).toHaveBeenCalledWith('/inicio');
    });

    it('el lápiz abre la personalización de ese perfil', async () => {
      await render(<PlayerSelectScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Editar a MALE' }));
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/piloto', params: { id: male } });
      expect(readProfiles().activeProfileId).toBe(tomi);
    });

    it('dibuja el auto de cada uno con su color y su número', async () => {
      await render(<PlayerSelectScreen />);
      const numbers = screen.container
        .queryAll((node) => node.type === 'SkiaText')
        .map((node) => node.props.text);
      expect(numbers).toEqual(['27', '7']);
      const pink = screen.container.queryAll(
        (node) => node.type === 'Path' && node.props.color === '#F164AF',
      );
      expect(pink.length).toBeGreaterThan(0);
    });
  });
});
