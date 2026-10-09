import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { reloadPlayerPreferences, updatePlayerPreferences } from '@/hooks/usePlayerPreferences';

import { HomeScreen } from './HomeScreen';
import { COLORS } from './HomeScreen.styles';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const storage = Storage as unknown as { __reset: () => void };

describe('HomeScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    mockRouter.push.mockClear();
    await act(() => reloadPlayerPreferences());
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

  it('muestra el récord guardado del circuito', async () => {
    await act(() => updatePlayerPreferences({ bestLapsMs: { 'autodromo-del-lago': 72480 } }));
    await render(<HomeScreen />);
    expect(screen.getByTestId('home-record')).toHaveTextContent(
      'Tu récord en Autódromo del Lago1:12.480',
    );
  });

  it('sin récord lo dice', async () => {
    await render(<HomeScreen />);
    expect(screen.getByTestId('home-record')).toHaveTextContent(
      'Todavía sin récord en Autódromo del Lago',
    );
  });

  it('dibuja el auto en blanco sobre el panel azul (decorativo)', async () => {
    await render(<HomeScreen />);
    expect(screen.getByTestId('home-car', { includeHiddenElements: true })).toBeTruthy();
    const bodies = screen.container.queryAll(
      (node) => node.type === 'Path' && node.props.color === COLORS.car,
    );
    expect(bodies.length).toBeGreaterThan(0);
  });
});
