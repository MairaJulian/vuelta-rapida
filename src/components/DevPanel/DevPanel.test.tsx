import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';

import {
  CAMERA_SLIDERS,
  DevPanel,
  DRIVING_SLIDERS,
  FIXED_DRIVING_KEYS,
  formatReadings,
} from './DevPanel';
import { READINGS_INTERVAL_MS } from './DevPanel.styles';

function shared<Value>(initial: Value) {
  let value = initial;
  return {
    get: () => value,
    set: (next: Value) => {
      value = next;
    },
  };
}

async function renderPanel() {
  const car = shared<CarState>({ ...createCarState(0, 0, Math.PI / 2), vx: 10 });
  const props = {
    drivingConfig: DEFAULT_DRIVING_CONFIG,
    onDrivingConfigChange: jest.fn(),
    cameraConfig: DEFAULT_CAMERA_CONFIG,
    onCameraConfigChange: jest.fn(),
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
  });

  it('hay un slider por cada parámetro ajustable del modelo de manejo', () => {
    const adjustable = Object.keys(DEFAULT_DRIVING_CONFIG).filter(
      (key) => !FIXED_DRIVING_KEYS.includes(key as keyof typeof DEFAULT_DRIVING_CONFIG),
    );
    expect(DRIVING_SLIDERS.map((spec) => spec.key).sort()).toEqual(adjustable.sort());
  });
});

describe('DevPanel', () => {
  it('empieza cerrado, solo con el botón para abrirlo', async () => {
    await renderPanel();
    expect(screen.getByText('Ajustes')).toBeTruthy();
    expect(screen.queryByText('Agarre lateral')).toBeNull();
  });

  it('al abrirlo muestra lecturas y todos los sliders', async () => {
    await renderPanel();
    await openPanel();
    expect(screen.getByTestId('reading-speed')).toHaveTextContent('36 km/h');
    expect(screen.getByTestId('reading-heading')).toHaveTextContent('90°');
    expect(screen.getByTestId('reading-fps')).toHaveTextContent('90');
    for (const spec of [...DRIVING_SLIDERS, ...CAMERA_SLIDERS]) {
      expect(screen.getByText(spec.label)).toBeTruthy();
    }
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

  it('Restablecer vuelve a los valores por defecto', async () => {
    const props = await renderPanel();
    await openPanel();
    await fireEvent.press(screen.getByText('Restablecer'));
    expect(props.onDrivingConfigChange).toHaveBeenLastCalledWith(DEFAULT_DRIVING_CONFIG);
    expect(props.onCameraConfigChange).toHaveBeenLastCalledWith(DEFAULT_CAMERA_CONFIG);
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
