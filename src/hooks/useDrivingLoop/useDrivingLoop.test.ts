import { act, renderHook } from '@testing-library/react-native';
import { useFrameCallback } from 'react-native-reanimated';

import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_DRIVING_CONFIG, getForwardSpeed } from '@/core/DrivingModel';
import type { DrivingInput } from '@/core/DrivingModel';
import { createLapState, getCurrentLap } from '@/core/LapTimer';
import { clamp, wrapAngle } from '@/core/MathUtils';
import { createCircuit, getStartPose, OVAL_CIRCUIT } from '@/core/Track';
import type { Circuit } from '@/core/Track';

import { useDrivingLoop } from './useDrivingLoop';

const viewport = { width: 800, height: 360 };
const start = getStartPose(OVAL_CIRCUIT);

function sharedInput(initial: DrivingInput) {
  let value = initial;
  return {
    get: () => value,
    set: (next: DrivingInput) => {
      value = next;
    },
  };
}

function runFrames(count: number, dtMs = 1000 / 60) {
  const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
  for (let i = 0; i < count; i += 1) {
    callback({ timestamp: i * dtMs, timeSincePreviousFrame: dtMs, timeSinceFirstFrame: i * dtMs });
  }
}

const FIXED_CAMERA = { ...DEFAULT_CAMERA_CONFIG, lookAheadSeconds: 0, speedZoomOut: 0 };

async function renderLoop(
  input = sharedInput({ steer: 0, brake: 0 }),
  cameraConfig = FIXED_CAMERA,
  track: Circuit = OVAL_CIRCUIT,
  onBestLap?: (ticks: number) => void,
) {
  const { result } = await renderHook(() =>
    useDrivingLoop({
      input: input as never,
      track,
      viewport,
      drivingConfig: DEFAULT_DRIVING_CONFIG,
      cameraConfig,
      onBestLap,
    }),
  );
  return { result, input };
}

/** Círculo de 60 m de radio en sentido horario, con la meta arriba mirando a +x. */
const CIRCLE = createCircuit({
  id: 'circulo',
  name: 'Círculo',
  width: 14,
  checkpointFractions: [1 / 3, 2 / 3],
  centerline: Array.from({ length: 120 }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / 120;
    return { x: 60 * Math.cos(angle), z: 60 * Math.sin(angle) };
  }),
});

/** Piloto automático para el círculo: apunta a un punto del trazado 10 m más adelante. */
function circleAutopilot(car: { x: number; z: number; heading: number }): DrivingInput {
  const ahead = Math.atan2(car.z, car.x) + 10 / 60;
  const targetX = 60 * Math.cos(ahead);
  const targetZ = 60 * Math.sin(ahead);
  const desired = Math.atan2(targetX - car.x, car.z - targetZ);
  return { steer: clamp(wrapAngle(desired - car.heading) * 4, -1, 1), brake: 0 };
}

describe('useDrivingLoop', () => {
  beforeEach(() => {
    jest.mocked(useFrameCallback).mockClear();
  });

  it('empieza detenido en la largada', async () => {
    const { result } = await renderLoop();
    const car = result.current.car.value;
    expect(car.x).toBe(start.x);
    expect(car.z).toBe(start.z);
    expect(getForwardSpeed(car)).toBe(0);
  });

  it('registra el loop por cuadro', async () => {
    await renderLoop();
    expect(useFrameCallback).toHaveBeenCalled();
  });

  it('con entrada neutra acelera solo hacia la meta', async () => {
    const { result } = await renderLoop();
    runFrames(60);
    const car = result.current.car.value;
    expect(car.x).toBeGreaterThan(start.x);
    expect(getForwardSpeed(car)).toBeGreaterThan(10);
  });

  it('lee la entrada en cada cuadro', async () => {
    const { result, input } = await renderLoop();
    runFrames(30);
    input.set({ steer: 1, brake: 0 });
    runFrames(30);
    expect(result.current.car.value.heading).toBeGreaterThan(start.heading);
  });

  it('calcula los fps', async () => {
    const { result } = await renderLoop();
    runFrames(10, 1000 / 90);
    expect(Math.round(result.current.fps.value)).toBe(90);
  });

  it('la cámara centra el auto en la pantalla', async () => {
    const { result } = await renderLoop();
    runFrames(20);
    const car = result.current.car.value;
    expect(result.current.cameraTransform.value).toEqual([
      { translateX: 400 },
      { translateY: 180 },
      { rotate: -0 },
      { scale: DEFAULT_CAMERA_CONFIG.pixelsPerMeter },
      { translateX: -car.x },
      { translateY: -car.z },
    ]);
  });

  it('la cámara se adelanta de a poco en la dirección del movimiento y reset la centra', async () => {
    const { result } = await renderLoop(undefined, { ...DEFAULT_CAMERA_CONFIG, speedZoomOut: 0 });
    // Cuánto se adelanta el centro de la pantalla respecto del auto, en x (el auto va hacia +x).
    const lead = () => {
      const [, , , , target] = result.current.cameraTransform.value as { translateX: number }[];
      return -target.translateX - result.current.car.value.x;
    };
    runFrames(5);
    const early = lead();
    runFrames(115);
    const later = lead();
    expect(early).toBeGreaterThan(0);
    expect(later).toBeGreaterThan(early * 3);

    await act(() => result.current.reset());
    expect(lead()).toBe(0);
  });

  it('el auto se dibuja en su posición y con su rumbo', async () => {
    const { result } = await renderLoop();
    runFrames(20);
    const car = result.current.car.value;
    expect(result.current.carTransform.value).toEqual([
      { translateX: car.x },
      { translateY: car.z },
      { rotate: car.heading },
    ]);
  });

  it('reset vuelve a la largada, detenido y con las vueltas sin empezar', async () => {
    const { result } = await renderLoop();
    runFrames(120);
    expect(getCurrentLap(result.current.laps.value)).toBe(1);
    await act(() => result.current.reset());
    const car = result.current.car.value;
    expect(car.x).toBe(start.x);
    expect(getForwardSpeed(car)).toBe(0);
    expect(result.current.laps.value).toEqual(createLapState());
  });

  it('expone las vueltas: al cruzar la meta empieza la vuelta 1', async () => {
    const { result } = await renderLoop();
    expect(getCurrentLap(result.current.laps.value)).toBe(0);
    // Larga 15 m antes de la meta, detenido: en dos segundos ya la cruzó.
    runFrames(120);
    const laps = result.current.laps.value;
    expect(getCurrentLap(laps)).toBe(1);
    expect(laps.tick).toBe(120);
  });

  it('avisa en el hilo de JS cuando mejora la mejor vuelta', async () => {
    const onBestLap = jest.fn();
    const input = sharedInput({ steer: 0, brake: 0 });
    const { result } = await renderLoop(input, FIXED_CAMERA, CIRCLE, onBestLap);
    const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
    for (let i = 0; i < 1500 && result.current.laps.value.lapTicks.length < 1; i += 1) {
      input.set(circleAutopilot(result.current.car.value));
      callback({ timestamp: i * 16, timeSincePreviousFrame: 1000 / 60, timeSinceFirstFrame: 0 });
    }
    // scheduleOnRN llega en una microtarea.
    await act(async () => {
      await Promise.resolve();
    });
    const best = result.current.laps.value.bestLapTicks;
    expect(best).not.toBeNull();
    expect(onBestLap).toHaveBeenCalledTimes(1);
    expect(onBestLap).toHaveBeenCalledWith(best);
  });
});
