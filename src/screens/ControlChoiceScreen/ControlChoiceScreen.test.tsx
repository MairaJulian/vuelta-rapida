import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import {
  readPlayerPreferences,
  reloadPlayerPreferences,
  updatePlayerPreferences,
} from '@/hooks/usePlayerPreferences';

import { ControlChoiceScreen } from './ControlChoiceScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const storage = Storage as unknown as { __reset: () => void };

async function renderScreen() {
  await render(<ControlChoiceScreen />);
}

describe('ControlChoiceScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadPlayerPreferences());
    jest.clearAllMocks();
  });

  it('muestra las dos opciones con los textos del handoff', async () => {
    await renderScreen();
    expect(screen.getByRole('header')).toHaveTextContent('¿Cómo querés manejar?');
    expect(screen.getByText('Inclinación')).toBeTruthy();
    expect(screen.getByText('Botones')).toBeTruthy();
    expect(screen.getByText('Más real')).toBeTruthy();
    expect(screen.getByText('Más preciso')).toBeTruthy();
  });

  it('la primera vez no marca ninguna opción y no muestra Volver', async () => {
    await renderScreen();
    expect(screen.getByTestId('control-card-tilt')).toHaveProp('accessibilityState', {
      checked: false,
    });
    expect(screen.getByTestId('control-card-buttons')).toHaveProp('accessibilityState', {
      checked: false,
    });
    expect(screen.queryByLabelText('Volver')).toBeNull();
  });

  it('Seguir no hace nada hasta que el jugador elige', async () => {
    await renderScreen();
    expect(screen.getByLabelText('Seguir')).toHaveProp('accessibilityState', { disabled: true });
    await fireEvent.press(screen.getByLabelText('Seguir'));
    expect(readPlayerPreferences().controlMode).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('control-card-tilt'));
    expect(screen.getByLabelText('Seguir')).toHaveProp('accessibilityState', { disabled: false });
  });

  it('con inclinación sin calibrar, guarda la elección y va a la calibración', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('control-card-tilt'));
    await fireEvent.press(screen.getByLabelText('Seguir'));
    expect(readPlayerPreferences().controlMode).toBe('tilt');
    expect(mockRouter.push).toHaveBeenCalledWith('/calibracion');
  });

  it('con botones, guarda la elección y va a la pista', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('control-card-buttons'));
    await fireEvent.press(screen.getByLabelText('Seguir'));
    expect(readPlayerPreferences().controlMode).toBe('buttons');
    expect(mockRouter.replace).toHaveBeenCalledWith('/pista');
  });

  it('con inclinación ya calibrada, va directo a la pista', async () => {
    await act(() => updatePlayerPreferences({ tiltNeutralAngle: 0.1 }));
    await renderScreen();
    await fireEvent.press(screen.getByTestId('control-card-tilt'));
    await fireEvent.press(screen.getByLabelText('Seguir'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/pista');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('recuerda la elección guardada, sea cual sea', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'buttons' }));
    await renderScreen();
    expect(screen.getByTestId('control-card-buttons')).toHaveProp('accessibilityState', {
      checked: true,
    });

    await act(() => updatePlayerPreferences({ controlMode: 'tilt' }));
    await renderScreen();
    expect(screen.getByTestId('control-card-tilt')).toHaveProp('accessibilityState', {
      checked: true,
    });
    expect(screen.getByLabelText('Seguir')).toHaveProp('accessibilityState', { disabled: false });
  });

  it('si se puede volver, muestra Volver', async () => {
    mockRouter.canGoBack.mockReturnValueOnce(true);
    await renderScreen();
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
