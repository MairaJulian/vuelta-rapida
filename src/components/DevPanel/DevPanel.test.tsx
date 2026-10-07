import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';
import type { ControlMode } from '@/core/PlayerPreferences';
import { createTiltState, DEFAULT_TILT_CONFIG } from '@/core/TiltSteering';
import type { TiltSteeringResult } from '@/core/TiltSteering';
import type { TrackData } from '@/core/Track';

import {
  CAMERA_SLIDERS,
  DevPanel,
  DRIVING_SLIDERS,
  FIXED_DRIVING_KEYS,
  formatReadings,
  formatTiltReadings,
  TILT_SLIDERS,
  TRACK_SLIDERS,
} from './DevPanel';
import { READINGS_INTERVAL_MS } from './DevPanel.styles';

const DEG = Math.PI / 180;

function shared<Value>(initial: Value) {
  let value = initial;
  return {
    get: () => value,
    set: (next: Value) => {
      value = next;
    },
  };
}

function tiltResult(relativeAngle: number, steer: number): TiltSteeringResult {
  return { state: createTiltState(), steer, relativeAngle, confidence: 1 };
}

async function renderPanel({
  track = DEFAULT_CIRCUIT as TrackData,
  controlMode = 'buttons' as ControlMode,
  tiltConfig = DEFAULT_TILT_CONFIG,
} = {}) {
  const car = shared<CarState>({ ...createCarState(0, 0, Math.PI / 2), vx: 10 });
  const props = {
    drivingConfig: DEFAULT_DRIVING_CONFIG,
    onDrivingConfigChange: jest.fn(),
    cameraConfig: DEFAULT_CAMERA_CONFIG,
    onCameraConfigChange: jest.fn(),
    track,
    onTrackChange: jest.fn(),
    controlMode,
    onControlModeChange: jest.fn(),
    tiltConfig,
    onTiltConfigChange: jest.fn(),
    tiltOutput: shared(tiltResult(12 * DEG, 0.35)) as unknown as SharedValue<TiltSteeringResult>,
    onRecalibrate: jest.fn(),
    onOpenCalibration: jest.fn(),
    car: car as unknown as SharedValue<CarState>,
    fps: shared(89.6) as unknown as SharedValue<number>,
    onResetCar: jest.fn(),
  };
  await render(<DevPanel {...props} />);
  return { ...props, car };
}

async function openPanel() {
  await fireEvent.press(screen.getByLabelText('Abrir el panel de ajuste'));
}

type PanHandlers = { onStart?: (event: { x: number }) => void };

/**
 * Arrastra el slider hasta la fracción indicada de su pista (de 200 dp), llamando
 * al callback del gesto (fireGestureHandler provoca act() superpuestos con RNTL 14).
 */
async function slide(key: string, ratio: number) {
  await fireEvent(screen.getByTestId(`slider-${key}-track`), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } },
  });
  const handlers = getByGestureTestId(`slider-${key}-gesture`).handlers as PanHandlers;
  handlers.onStart?.({ x: ratio * 200 });
}

describe('formatReadings', () => {
  it('muestra la velocidad en km/h', () => {
    const car = { ...createCarState(0, 0, 0), vz: -10 };
    expect(formatReadings(car, 60).speed).toBe('36 km/h');
  });

  it('en marcha atrás muestra la velocidad negativa', () => {
    // Mira hacia -z y se mueve hacia +z.
    const reversing = { ...createCarState(0, 0, 0), vz: 5 };
    expect(formatReadings(reversing, 60).speed).toBe('-18 km/h');
    expect(formatReadings(createCarState(0, 0, 0), 60).speed).toBe('0 km/h');
  });

  it('muestra el rumbo en grados, 0 arriba y en sentido horario', () => {
    expect(formatReadings(createCarState(0, 0, Math.PI / 2), 60).heading).toBe('90°');
    expect(formatReadings(createCarState(0, 0, -Math.PI / 2), 60).heading).toBe('270°');
    expect(formatReadings(createCarState(0, 0, 0), 60).heading).toBe('0°');
  });

  it('no muestra "-0.0" cuando la deriva es casi nula', () => {
    const almostStraight = { ...createCarState(0, 0, 0), vx: -0.04 };
    expect(formatReadings(almostStraight, 60).drift).toBe('0.0 m/s');
  });

  it('muestra la deriva con signo y los fps redondeados', () => {
    const sliding = { ...createCarState(0, 0, 0), vx: 2.26 };
    expect(formatReadings(sliding, 59.6)).toMatchObject({ drift: '2.3 m/s', fps: '60' });
  });
});

describe('formatTiltReadings', () => {
  it('muestra el ángulo con signo y la dirección con dos decimales', () => {
    expect(formatTiltReadings(tiltResult(-7 * DEG, -0.123))).toEqual({
      angle: '−7°',
      steer: '-0.12',
    });
  });

  it('no muestra "-0.00" cuando la dirección es casi nula', () => {
    expect(formatTiltReadings(tiltResult(0, -0.001)).steer).toBe('0.00');
  });
});

describe('sliders', () => {
  it('cada rango contiene el valor por defecto', () => {
    for (const spec of DRIVING_SLIDERS) {
      expect(DEFAULT_DRIVING_CONFIG[spec.key]).toBeGreaterThanOrEqual(spec.min);
      expect(DEFAULT_DRIVING_CONFIG[spec.key]).toBeLessThanOrEqual(spec.max);
    }
    for (const spec of CAMERA_SLIDERS) {
      expect(DEFAULT_CAMERA_CONFIG[spec.key]).toBeGreaterThanOrEqual(spec.min);
      expect(DEFAULT_CAMERA_CONFIG[spec.key]).toBeLessThanOrEqual(spec.max);
    }
    for (const spec of TRACK_SLIDERS) {
      expect(DEFAULT_CIRCUIT[spec.key]).toBeGreaterThanOrEqual(spec.min);
      expect(DEFAULT_CIRCUIT[spec.key]).toBeLessThanOrEqual(spec.max);
    }
    for (const spec of TILT_SLIDERS) {
      expect(DEFAULT_TILT_CONFIG[spec.key]).toBeGreaterThanOrEqual(spec.min);
      expect(DEFAULT_TILT_CONFIG[spec.key]).toBeLessThanOrEqual(spec.max);
    }
  });

  it('hay un slider por cada parámetro de la inclinación, salvo la calibración', () => {
    const adjustable = Object.keys(DEFAULT_TILT_CONFIG).filter((key) => key !== 'neutralAngle');
    expect(TILT_SLIDERS.map((spec) => spec.key).sort()).toEqual(adjustable.sort());
  });

  it('hay un slider por cada parámetro ajustable del modelo de manejo', () => {
    const adjustable = Object.keys(DEFAULT_DRIVING_CONFIG).filter(
      (key) => !FIXED_DRIVING_KEYS.includes(key as keyof typeof DEFAULT_DRIVING_CONFIG),
    );
    expect(DRIVING_SLIDERS.map((spec) => spec.key).sort()).toEqual(adjustable.sort());
  });

  it('hay un slider por cada parámetro numérico de la cámara', () => {
    const numeric = Object.keys(DEFAULT_CAMERA_CONFIG).filter((key) => key !== 'rotateWithCar');
    expect(CAMERA_SLIDERS.map((spec) => spec.key).sort()).toEqual(numeric.sort());
  });
});

describe('DevPanel', () => {
  it('empieza cerrado, solo con el botón para abrirlo', async () => {
    await renderPanel();
    expect(screen.getByText('Ajustes')).toBeTruthy();
    expect(screen.queryByText('Agarre lateral')).toBeNull();
  });

  it('al abrirlo con botones muestra lecturas y los sliders de botones, manejo, pista y cámara', async () => {
    await renderPanel();
    await openPanel();
    expect(screen.getByTestId('reading-speed')).toHaveTextContent('36 km/h');
    expect(screen.getByTestId('reading-heading')).toHaveTextContent('90°');
    expect(screen.getByTestId('reading-fps')).toHaveTextContent('90');
    for (const spec of [...DRIVING_SLIDERS, ...TRACK_SLIDERS, ...CAMERA_SLIDERS]) {
      expect(screen.getByText(spec.label)).toBeTruthy();
    }
    expect(screen.getByText('Cámara gira con el auto')).toBeTruthy();
  });

  it('con botones oculta la sección de inclinación', async () => {
    await renderPanel();
    await openPanel();
    // "Inclinación" queda solo en el selector, sin el título de la sección.
    expect(screen.getAllByText('Inclinación')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: 'Inclinación' })).toBeTruthy();
    for (const spec of TILT_SLIDERS) {
      expect(screen.queryByText(spec.label)).toBeNull();
    }
    expect(screen.queryByText('Recalibrar')).toBeNull();
    expect(screen.queryByText('Calibración completa')).toBeNull();
  });

  it('en modo inclinación muestra también sus sliders y acciones', async () => {
    await renderPanel({ controlMode: 'tilt' });
    await openPanel();
    for (const spec of [...TILT_SLIDERS, ...DRIVING_SLIDERS, ...TRACK_SLIDERS, ...CAMERA_SLIDERS]) {
      expect(screen.getByText(spec.label)).toBeTruthy();
    }
    expect(screen.getByText('Recalibrar')).toBeTruthy();
    expect(screen.getByText('Calibración completa')).toBeTruthy();
  });

  it('un slider de manejo cambia solo su parámetro', async () => {
    const props = await renderPanel();
    await openPanel();
    await slide('lateralGrip', 0);
    expect(props.onDrivingConfigChange).toHaveBeenLastCalledWith({
      ...DEFAULT_DRIVING_CONFIG,
      lateralGrip: 1,
    });
  });

  it('un slider de cámara cambia solo su parámetro', async () => {
    const props = await renderPanel();
    await openPanel();
    await slide('pixelsPerMeter', 1);
    expect(props.onCameraConfigChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CAMERA_CONFIG,
      pixelsPerMeter: 30,
    });
  });

  it('el slider de pista cambia solo el ancho', async () => {
    const props = await renderPanel();
    await openPanel();
    await slide('width', 1);
    expect(props.onTrackChange).toHaveBeenLastCalledWith({ ...DEFAULT_CIRCUIT, width: 20 });
  });

  it('Restablecer vuelve a los valores por defecto, sin cambiar el trazado', async () => {
    const custom = {
      centerline: [
        { x: 0, z: 0 },
        { x: 50, z: 0 },
        { x: 25, z: 40 },
      ],
      width: 20,
    };
    const calibrated = { ...DEFAULT_TILT_CONFIG, neutralAngle: 0.2, deadZone: 0.1, smoothing: 0.2 };
    const props = await renderPanel({ track: custom, tiltConfig: calibrated });
    await openPanel();
    await fireEvent.press(screen.getByText('Restablecer'));
    expect(props.onDrivingConfigChange).toHaveBeenLastCalledWith(DEFAULT_DRIVING_CONFIG);
    expect(props.onCameraConfigChange).toHaveBeenLastCalledWith(DEFAULT_CAMERA_CONFIG);
    expect(props.onTrackChange).toHaveBeenLastCalledWith({
      ...custom,
      width: DEFAULT_CIRCUIT.width,
    });
    // Los ajustes de la inclinación vuelven a los valores por defecto; la calibración, no.
    expect(props.onTiltConfigChange).toHaveBeenLastCalledWith({
      ...DEFAULT_TILT_CONFIG,
      neutralAngle: 0.2,
    });
  });

  it('el selector cambia el modo de control en caliente', async () => {
    const props = await renderPanel();
    await openPanel();
    expect(screen.getByRole('radio', { name: 'Botones' })).toHaveProp('accessibilityState', {
      checked: true,
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Inclinación' }));
    expect(props.onControlModeChange).toHaveBeenCalledWith('tilt');
  });

  it('un slider de inclinación cambia solo su parámetro', async () => {
    const props = await renderPanel({ controlMode: 'tilt' });
    await openPanel();
    await slide('smoothing', 1);
    expect(props.onTiltConfigChange).toHaveBeenLastCalledWith({
      ...DEFAULT_TILT_CONFIG,
      smoothing: 0.3,
    });
    await slide('sensitivity', 0);
    expect(props.onTiltConfigChange).toHaveBeenLastCalledWith({
      ...DEFAULT_TILT_CONFIG,
      sensitivity: 1,
    });
  });

  it('muestra el ángulo leído y la dirección solo en modo inclinación', async () => {
    await renderPanel({ controlMode: 'tilt' });
    await openPanel();
    expect(screen.getByTestId('reading-tilt-angle')).toHaveTextContent('+12°');
    expect(screen.getByTestId('reading-tilt-steer')).toHaveTextContent('0.35');
  });

  it('con botones no muestra las lecturas de inclinación', async () => {
    await renderPanel();
    await openPanel();
    expect(screen.queryByTestId('reading-tilt-angle')).toBeNull();
  });

  it('Recalibrar toma la posición en modo inclinación', async () => {
    const tilt = await renderPanel({ controlMode: 'tilt' });
    await openPanel();
    await fireEvent.press(screen.getByText('Recalibrar'));
    expect(tilt.onRecalibrate).toHaveBeenCalledTimes(1);
  });

  it('Calibración completa abre la pantalla de calibración', async () => {
    const props = await renderPanel({ controlMode: 'tilt' });
    await openPanel();
    await fireEvent.press(screen.getByText('Calibración completa'));
    expect(props.onOpenCalibration).toHaveBeenCalled();
  });

  it('el interruptor activa la cámara que gira con el auto', async () => {
    const props = await renderPanel();
    await openPanel();
    await fireEvent(screen.getByTestId('switch-rotateWithCar'), 'valueChange', true);
    expect(props.onCameraConfigChange).toHaveBeenLastCalledWith({
      ...DEFAULT_CAMERA_CONFIG,
      rotateWithCar: true,
    });
  });

  it('Reiniciar auto pide volver a la largada', async () => {
    const props = await renderPanel();
    await openPanel();
    await fireEvent.press(screen.getByText('Reiniciar auto'));
    expect(props.onResetCar).toHaveBeenCalled();
  });

  it('refresca las lecturas mientras está abierto', async () => {
    jest.useFakeTimers();
    try {
      const props = await renderPanel();
      await openPanel();
      props.car.set({ ...createCarState(0, 0, 0), vz: -20 });
      await act(() => jest.advanceTimersByTime(READINGS_INTERVAL_MS));
      expect(screen.getByTestId('reading-speed')).toHaveTextContent('72 km/h');
    } finally {
      jest.useRealTimers();
    }
  });
});
