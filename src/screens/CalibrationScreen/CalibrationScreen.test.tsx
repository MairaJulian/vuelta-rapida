import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { useAnimatedSensor, useFrameCallback } from 'react-native-reanimated';

import { deadZoneFromLevel } from '@/core/PlayerPreferences';
import {
  readPlayerPreferences,
  reloadPlayerPreferences,
  updatePlayerPreferences,
} from '@/hooks/usePlayerPreferences';

import { CalibrationScreen } from './CalibrationScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
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

const DEG = Math.PI / 180;
const storage = Storage as unknown as { __reset: () => void };

/** Celular en horizontal (rotación 90) girado `degrees` como un volante. */
function holdPhone(degrees: number) {
  const { sensor } = jest.mocked(useAnimatedSensor).mock.results.at(-1)!.value;
  const angle = degrees * DEG;
  sensor.set({
    x: -9.81 * Math.cos(angle),
    y: -9.81 * Math.sin(angle),
    z: -3,
    interfaceOrientation: 90,
  });
  const frame = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
  frame({ timestamp: 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 });
}

type PanHandlers = { onStart?: (event: { x: number }) => void };

/** Mueve un slider a una fracción de su recorrido (0 a 1). */
async function slide(testID: string, ratio: number) {
  await fireEvent(screen.getByTestId(`${testID}-track`), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
  });
  const handlers = getByGestureTestId(`${testID}-gesture`).handlers as PanHandlers;
  await act(() => handlers.onStart?.({ x: ratio * 200 }));
}

const sliderValue = (testID: string) =>
  screen.getByTestId(`${testID}-track`).props.accessibilityValue.now;

describe('CalibrationScreen', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadPlayerPreferences());
    jest.clearAllMocks();
  });

  it('muestra la consigna, el medidor, la sensibilidad y la zona muerta', async () => {
    await render(<CalibrationScreen />);
    expect(screen.getByRole('header')).toHaveTextContent('Calibrá el volante');
    expect(screen.getByText(/Sostené el celular como vas a jugar/)).toBeTruthy();
    expect(screen.getByTestId('calibration-gauge')).toBeTruthy();
    expect(
      screen.getByText('En la zona azul el auto va derecho. En las marcas, dobla a fondo.'),
    ).toBeTruthy();
    expect(screen.getByText('Sensibilidad')).toBeTruthy();
    expect(screen.getByText('Suave')).toBeTruthy();
    expect(screen.getByText('Rápida')).toBeTruthy();
    expect(screen.getByText('Zona muerta')).toBeTruthy();
    expect(screen.getByText('Chica')).toBeTruthy();
    expect(screen.getByText('Grande')).toBeTruthy();
  });

  it('Listo guarda la posición actual como derecho y va a la pista', async () => {
    await render(<CalibrationScreen />);
    holdPhone(12);
    await fireEvent.press(screen.getByLabelText('Listo'));
    const saved = readPlayerPreferences();
    expect(saved.controlMode).toBe('tilt');
    expect(saved.tiltNeutralAngle).toBeCloseTo(12 * DEG, 6);
    expect(mockRouter.replace).toHaveBeenCalledWith('/pista');
  });

  it('guarda la sensibilidad elegida', async () => {
    await render(<CalibrationScreen />);
    await slide('slider-sensitivity', 1);
    await fireEvent.press(screen.getByLabelText('Listo'));
    expect(readPlayerPreferences().tiltSensitivity).toBe(10);
  });

  it('arranca con la sensibilidad guardada', async () => {
    await act(() => updatePlayerPreferences({ tiltSensitivity: 3 }));
    await render(<CalibrationScreen />);
    expect(screen.getByTestId('slider-sensitivity-track')).toHaveProp(
      'accessibilityValue',
      expect.objectContaining({ now: 3 }),
    );
  });

  it('la zona muerta arranca en el nivel 3 (5°) y se guarda en grados', async () => {
    await render(<CalibrationScreen />);
    expect(sliderValue('slider-dead-zone')).toBe(3);
    await slide('slider-dead-zone', 1);
    await fireEvent.press(screen.getByLabelText('Listo'));
    expect(readPlayerPreferences().tiltDeadZone).toBeCloseTo(9 * DEG, 9);
  });

  it('arranca con la zona muerta guardada', async () => {
    await act(() => updatePlayerPreferences({ tiltDeadZone: deadZoneFromLevel(4) }));
    await render(<CalibrationScreen />);
    expect(sliderValue('slider-dead-zone')).toBe(4);
  });

  it('la sensibilidad y la zona muerta se eligen por separado', async () => {
    await render(<CalibrationScreen />);
    await slide('slider-sensitivity', 1);
    expect(sliderValue('slider-dead-zone')).toBe(3);
    await slide('slider-dead-zone', 0);
    expect(sliderValue('slider-sensitivity')).toBe(10);
    await fireEvent.press(screen.getByLabelText('Listo'));
    const saved = readPlayerPreferences();
    expect(saved.tiltSensitivity).toBe(10);
    expect(saved.tiltDeadZone).toBeCloseTo(1 * DEG, 9);
  });

  it('el medidor usa la sensibilidad y la zona muerta elegidas', async () => {
    await render(<CalibrationScreen />);
    const deadZonePath = () =>
      screen.container.queryAll((node) => node.type === 'Path')[1].props.path;
    const before = deadZonePath();
    await slide('slider-sensitivity', 1);
    // La sensibilidad no cambia la zona azul...
    expect(deadZonePath()).toBe(before);
    // ...la zona muerta, sí.
    await slide('slider-dead-zone', 1);
    expect(deadZonePath()).not.toBe(before);
  });

  it('Volver regresa a la pantalla anterior o, si no hay, a la elección de control', async () => {
    await render(<CalibrationScreen />);
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/control');

    mockRouter.canGoBack.mockReturnValueOnce(true);
    await fireEvent.press(screen.getByLabelText('Volver'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
