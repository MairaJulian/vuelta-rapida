import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useKeepAwake } from 'expo-keep-awake';
import Storage from 'expo-sqlite/kv-store';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useAnimatedSensor, useFrameCallback } from 'react-native-reanimated';

import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { MAX_DEAD_ZONE } from '@/core/TiltSteering';
import {
  readPlayerPreferences,
  reloadPlayerPreferences,
  updatePlayerPreferences,
} from '@/hooks/usePlayerPreferences';
import { COLORS as TRACK_COLORS } from '@/render/TrackLayer/TrackLayer.styles';

import { DriveScreen } from './DriveScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
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

  it('desde el panel se cambia el modo en caliente y queda guardado', async () => {
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Inclinación' }));
    expect(readPlayerPreferences().controlMode).toBe('tilt');
    expect(screen.getByTestId('tilt-controls')).toBeTruthy();
  });

  it('el panel muestra los ajustes de inclinación solo al elegir inclinación', async () => {
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    expect(screen.queryByText('Calibración completa')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Inclinación' }));
    expect(screen.getByText('Calibración completa')).toBeTruthy();
  });

  it('Recalibrar del panel guarda la posición actual del celular como derecho', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0 }));
    await render(<DriveScreen />);
    // Celular en horizontal (rotación 90) girado 10° a la derecha.
    const angle = (10 * Math.PI) / 180;
    const { sensor } = jest.mocked(useAnimatedSensor).mock.results.at(-1)!.value;
    sensor.set({
      x: -9.81 * Math.cos(angle),
      y: -9.81 * Math.sin(angle),
      z: -3,
      interfaceOrientation: 90,
    });
    for (const [callback] of jest.mocked(useFrameCallback).mock.calls) {
      callback({ timestamp: 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 });
    }
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent.press(screen.getByText('Recalibrar'));
    expect(readPlayerPreferences().tiltNeutralAngle).toBeCloseTo(angle, 6);
  });

  it('la zona muerta del panel se guarda sin tocar la sensibilidad', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0 }));
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent(screen.getByTestId('slider-deadZone-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
    });
    const handlers = getByGestureTestId('slider-deadZone-gesture').handlers as {
      onStart?: (event: { x: number }) => void;
    };
    await act(() => handlers.onStart?.({ x: 200 }));
    // DevSlider redondea a 6 decimales.
    expect(readPlayerPreferences().tiltDeadZone).toBeCloseTo(MAX_DEAD_ZONE, 5);
    expect(readPlayerPreferences().tiltSensitivity).toBe(5);
  });

  it('Calibración completa del panel abre la pantalla de calibración', async () => {
    await act(() => updatePlayerPreferences({ controlMode: 'tilt', tiltNeutralAngle: 0 }));
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent.press(screen.getByText('Calibración completa'));
    expect(mockRouter.push).toHaveBeenCalledWith('/calibracion');
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

  it('muestra el HUD de vueltas con el récord guardado del circuito', async () => {
    await act(() => updatePlayerPreferences({ bestLapsMs: { 'autodromo-del-lago': 72480 } }));
    await render(<DriveScreen />);
    expect(screen.getByTestId('lap-hud-lap')).toHaveTextContent('1');
    expect(screen.getByTestId('lap-hud-time')).toHaveTextContent('0:00.000');
    expect(screen.getByTestId('lap-hud-best')).toHaveTextContent('1:12.480');
  });

  it('el ancho de pista del panel cambia el circuito sin perder sus datos', async () => {
    await render(<DriveScreen />);
    await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
    await fireEvent(screen.getByTestId('slider-width-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
    });
    const handlers = getByGestureTestId('slider-width-gesture').handlers as {
      onStart?: (event: { x: number }) => void;
    };
    await act(() => handlers.onStart?.({ x: 0 }));
    // El asfalto se dibuja con el ancho nuevo, sobre el mismo trazado del circuito.
    const [asphalt] = screen.container.queryAll(
      (node) => node.type === 'Path' && node.props.color === TRACK_COLORS.asphalt,
    );
    expect(asphalt.props.strokeWidth).toBe(8);
    expect(asphalt.props.path.match(/[ML] /g)).toHaveLength(DEFAULT_CIRCUIT.centerline.length);
  });
});
