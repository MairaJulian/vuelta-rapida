import { act, renderHook } from '@testing-library/react-native';
import { Accelerometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SensorType, useAnimatedSensor, useFrameCallback } from 'react-native-reanimated';

import type { DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_TILT_CONFIG } from '@/core/TiltSteering';

import {
  FALLBACK_DELAY_MS,
  IDLE_TILT_RESULT,
  orientationToRotation,
  SENSOR_INTERVAL_MS,
  useTiltSteering,
} from './useTiltSteering';

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    setUpdateInterval: jest.fn(),
  },
}));

jest.mock('expo-screen-orientation', () => ({
  Orientation: {
    UNKNOWN: 0,
    PORTRAIT_UP: 1,
    PORTRAIT_DOWN: 2,
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4,
  },
  getOrientationAsync: jest.fn(() => Promise.resolve(4)),
  addOrientationChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const DEG = Math.PI / 180;
const G = 9.81;

/** Gravedad del celular en horizontal (rotación 90), girado `steer` grados como un volante. */
function landscapeGravity(steer: number) {
  // En rotación 90, x de pantalla = -y del celular e y de pantalla = x del celular.
  const screenX = G * Math.sin(steer * DEG);
  const screenY = -G * Math.cos(steer * DEG);
  return { x: screenY, y: -screenX, z: 0, interfaceOrientation: 90 };
}

function shared<Value>(initial: Value) {
  let value = initial;
  return {
    get: () => value,
    set: jest.fn((next: Value) => {
      value = next;
    }),
  };
}

function lastSensor() {
  return jest.mocked(useAnimatedSensor).mock.results.at(-1)!.value.sensor as {
    set: (value: Record<string, number>) => void;
  };
}

function runFrames(count: number) {
  const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
  for (let i = 0; i < count; i += 1) {
    callback({ timestamp: i * 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: i * 16 });
  }
}

describe('useTiltSteering', () => {
  beforeEach(() => {
    jest.mocked(useAnimatedSensor).mockClear();
    jest.mocked(useFrameCallback).mockClear();
    jest.mocked(Accelerometer.addListener).mockClear();
  });

  it('registra el sensor de gravedad sin el ajuste automático por orientación', async () => {
    // La corrección por orientación se hace una sola vez, en core/TiltSteering.
    await renderHook(() => useTiltSteering({ config: DEFAULT_TILT_CONFIG }));
    expect(useAnimatedSensor).toHaveBeenCalledWith(SensorType.GRAVITY, {
      interval: SENSOR_INTERVAL_MS,
      adjustToInterfaceOrientation: false,
    });
  });

  it('antes de la primera lectura publica un resultado derecho', async () => {
    const { result } = await renderHook(() => useTiltSteering({ config: DEFAULT_TILT_CONFIG }));
    expect(result.current.output.value).toEqual(IDLE_TILT_RESULT);
  });

  it('convierte la lectura en dirección y la escribe sin tocar el freno', async () => {
    const input = shared<DrivingInput>({ steer: 0, brake: 1 });
    const { result } = await renderHook(() =>
      useTiltSteering({ config: DEFAULT_TILT_CONFIG, input: input as never }),
    );
    lastSensor().set(landscapeGravity(15));
    runFrames(30);
    expect(result.current.output.value.relativeAngle).toBeCloseTo(15 * DEG, 6);
    // 15° con zona muerta de 5° y giro completo cerca de 25°: la mitad.
    expect(input.get().steer).toBeCloseTo(0.5, 3);
    expect(input.get().brake).toBe(1);
  });

  it('publica en el valor compartido que le pasan', async () => {
    const output = shared(IDLE_TILT_RESULT);
    await renderHook(() =>
      useTiltSteering({ config: DEFAULT_TILT_CONFIG, output: output as never }),
    );
    lastSensor().set(landscapeGravity(-30));
    runFrames(1);
    expect(output.get().steer).toBe(-1);
  });

  it('calibrate toma el ángulo actual como derecho', async () => {
    const { result } = await renderHook(() => useTiltSteering({ config: DEFAULT_TILT_CONFIG }));
    lastSensor().set(landscapeGravity(8));
    runFrames(1);
    const calibrated = result.current.calibrate(DEFAULT_TILT_CONFIG);
    expect(calibrated.neutralAngle).toBeCloseTo(8 * DEG, 9);
  });

  describe('respaldo con el acelerómetro', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('si no llegan lecturas de gravedad, escucha el acelerómetro', async () => {
      await renderHook(() => useTiltSteering({ config: DEFAULT_TILT_CONFIG }));
      expect(Accelerometer.addListener).not.toHaveBeenCalled();
      await act(() => jest.advanceTimersByTime(FALLBACK_DELAY_MS));
      expect(Accelerometer.addListener).toHaveBeenCalledTimes(1);
      expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(SENSOR_INTERVAL_MS);
    });

    it('usa el acelerómetro con el signo invertido', async () => {
      const input = shared<DrivingInput>({ steer: 0, brake: 0 });
      await renderHook(() =>
        useTiltSteering({ config: DEFAULT_TILT_CONFIG, input: input as never }),
      );
      await act(() => jest.advanceTimersByTime(FALLBACK_DELAY_MS));
      const listener = jest.mocked(Accelerometer.addListener).mock.calls[0][0];
      // El acelerómetro (en g) apunta al revés que la gravedad: girado 30° a la derecha.
      const gravity = landscapeGravity(30);
      listener({ x: -gravity.x / G, y: -gravity.y / G, z: 0, timestamp: 0 });
      runFrames(1);
      expect(input.get().steer).toBe(1);
    });

    it('con sensor de gravedad no usa el acelerómetro', async () => {
      await renderHook(() => useTiltSteering({ config: DEFAULT_TILT_CONFIG }));
      lastSensor().set(landscapeGravity(0));
      await act(() => jest.advanceTimersByTime(FALLBACK_DELAY_MS));
      expect(Accelerometer.addListener).not.toHaveBeenCalled();
    });
  });
});

describe('orientationToRotation', () => {
  it('traduce la orientación de la pantalla a grados de rotación en un celular', () => {
    expect(orientationToRotation(ScreenOrientation.Orientation.LANDSCAPE_RIGHT)).toBe(90);
    expect(orientationToRotation(ScreenOrientation.Orientation.LANDSCAPE_LEFT)).toBe(270);
    expect(orientationToRotation(ScreenOrientation.Orientation.PORTRAIT_DOWN)).toBe(180);
    expect(orientationToRotation(ScreenOrientation.Orientation.PORTRAIT_UP)).toBe(0);
  });
});
