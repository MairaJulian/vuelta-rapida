import { act, render, screen } from '@testing-library/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import Storage from 'expo-sqlite/kv-store';
import { useFrameCallback } from 'react-native-reanimated';

import { reloadPlayerPreferences, updatePlayerPreferences } from '@/hooks/usePlayerPreferences';

import { DriveScreen } from './DriveScreen';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    setUpdateInterval: jest.fn(),
  },
}));
jest.mock('expo-screen-orientation', () => ({
  Orientation: { LANDSCAPE_LEFT: 3, LANDSCAPE_RIGHT: 4 },
  getOrientationAsync: jest.fn(() => Promise.resolve(4)),
  addOrientationChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const storage = Storage as unknown as { __reset: () => void };

describe('DriveScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadPlayerPreferences());
  });

  it('muestra el lienzo y, sin modo elegido, los botones', async () => {
    await render(<DriveScreen />);
    expect(screen.getByTestId('drive-screen')).toBeTruthy();
    expect(screen.container.queryAll((node) => node.type === 'Canvas')).toHaveLength(1);
    expect(screen.getByLabelText('Doblar a la izquierda')).toBeTruthy();
    expect(screen.getByLabelText('Frenar o retroceder')).toBeTruthy();
  });

  it('con inclinación guardada muestra los frenos laterales y no las flechas', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0.1 }));
    await render(<DriveScreen />);
    expect(screen.getByTestId('tilt-controls')).toBeTruthy();
    expect(screen.getByLabelText('Frenar o retroceder, lado izquierdo')).toBeTruthy();
    expect(screen.queryByLabelText('Doblar a la izquierda')).toBeNull();
  });

  it('cambia de modo en caliente cuando cambian las preferencias', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'buttons' }));
    await render(<DriveScreen />);
    expect(screen.getByLabelText('Doblar a la izquierda')).toBeTruthy();
    await act(() => updatePlayerPreferences({ controlMode: 'tilt' }));
    expect(screen.getByTestId('tilt-controls')).toBeTruthy();
  });

  it('mantiene la pantalla encendida mientras se maneja', async () => {
    await render(<DriveScreen />);
    expect(useKeepAwake).toHaveBeenCalled();
  });

  it('en desarrollo incluye el panel de ajuste', async () => {
    expect(__DEV__).toBe(true);
    await render(<DriveScreen />);
    expect(screen.getByLabelText('Abrir el panel de ajuste')).toBeTruthy();
  });

  it('arranca el loop de la simulación', async () => {
    jest.mocked(useFrameCallback).mockClear();
    await render(<DriveScreen />);
    expect(useFrameCallback).toHaveBeenCalled();
  });
});
