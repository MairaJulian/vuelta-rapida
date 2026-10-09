import { act, renderHook } from '@testing-library/react-native';
import { useFrameCallback } from 'react-native-reanimated';

import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_DRIVING_CONFIG, getForwardSpeed } from '@/core/DrivingModel';
import type { DrivingInput } from '@/core/DrivingModel';
import { clamp, wrapAngle } from '@/core/MathUtils';
import { DEFAULT_RACE_CONFIG, getLightsOutTick } from '@/core/RaceFlow';
import type { RaceConfig, RaceEvent } from '@/core/RaceFlow';
import { createCircuit, getStartPose, OVAL_CIRCUIT } from '@/core/Track';
import type { Circuit } from '@/core/Track';

import { ENGINE_SAMPLE_MS, useRaceLoop } from './useRaceLoop';
import type { UseRaceLoopParams } from './useRaceLoop.types';

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

/** scheduleOnRN llega en una microtarea. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

const FIXED_CAMERA = { ...DEFAULT_CAMERA_CONFIG, lookAheadSeconds: 0, speedZoomOut: 0 };

async function renderLoop(overrides: Partial<UseRaceLoopParams> = {}) {
  const input = sharedInput({ steer: 0, brake: 0 });
  const { result, rerender } = await renderHook(
    (props: Partial<UseRaceLoopParams>) =>
      useRaceLoop({
        input: input as never,
        track: OVAL_CIRCUIT,
        viewport,
        drivingConfig: DEFAULT_DRIVING_CONFIG,
        cameraConfig: FIXED_CAMERA,
        raceConfig: DEFAULT_RACE_CONFIG,
        recordTicks: null,
        createSeed: () => 1234,
        ...props,
      }),
    { initialProps: overrides },
  );
  return { result, input, rerender };
}

/** Empieza el semáforo y corre hasta la largada. */
async function startRace(result: Awaited<ReturnType<typeof renderLoop>>['result']) {
  await act(() => result.current.startLights());
  runFrames(getLightsOutTick(result.current.race.value));
}

/** Círculo de 60 m de radio en sentido horario, con la meta arriba mirando a +x. */
const CIRCLE: Circuit = createCircuit({
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

describe('useRaceLoop', () => {
  beforeEach(() => {
    jest.mocked(useFrameCallback).mockClear();
  });

  it('empieza en la grilla, detenido en la largada', async () => {
    const { result } = await renderLoop();
    const car = result.current.car.value;
    expect(result.current.race.value.phase).toBe('grid');
    expect(car.x).toBe(start.x);
    expect(car.z).toBe(start.z);
    expect(getForwardSpeed(car)).toBe(0);
    expect(result.current.lapView.value).toEqual({ lap: 1, totalLaps: 3, lapTicks: 0 });
  });

  it('registra el loop por cuadro', async () => {
    await renderLoop();
    expect(useFrameCallback).toHaveBeenCalled();
  });

  it('no se mueve en la grilla ni durante el semáforo', async () => {
    const { result } = await renderLoop();
    runFrames(120);
    expect(result.current.car.value.x).toBe(start.x);
    await act(() => result.current.startLights());
    expect(result.current.race.value.phase).toBe('lights');
    runFrames(getLightsOutTick(result.current.race.value) - 1);
    expect(result.current.car.value.x).toBe(start.x);
    expect(result.current.race.value.phase).toBe('lights');
  });

  it('al apagarse las luces acelera solo hacia la meta', async () => {
    const { result } = await renderLoop();
    await startRace(result);
    expect(result.current.race.value.phase).toBe('racing');
    runFrames(60);
    const car = result.current.car.value;
    expect(car.x).toBeGreaterThan(start.x);
    expect(getForwardSpeed(car)).toBeGreaterThan(10);
    expect(result.current.lapView.value).toEqual({ lap: 1, totalLaps: 3, lapTicks: 60 });
  });

  it('lee la entrada en cada cuadro', async () => {
    const { result, input } = await renderLoop();
    await startRace(result);
    runFrames(30);
    input.set({ steer: 1, brake: 0 });
    runFrames(30);
    expect(result.current.car.value.heading).toBeGreaterThan(start.heading);
  });

  it('la pausa congela el auto y el tiempo; al volver sigue', async () => {
    const { result } = await renderLoop();
    await startRace(result);
    runFrames(30);
    await act(() => result.current.pause());
    const frozen = result.current.car.value;
    runFrames(120);
    expect(result.current.car.value).toEqual(frozen);
    expect(result.current.lapView.value.lapTicks).toBe(30);
    await act(() => result.current.resume());
    runFrames(30);
    expect(result.current.lapView.value.lapTicks).toBe(60);
  });

  it('restart vuelve a la grilla, detenido, y centra la cámara', async () => {
    const { result } = await renderLoop({
      cameraConfig: { ...DEFAULT_CAMERA_CONFIG, speedZoomOut: 0 },
    });
    await startRace(result);
    runFrames(120);
    await act(() => result.current.restart());
    expect(result.current.race.value.phase).toBe('grid');
    expect(result.current.race.value.sim.tick).toBe(0);
    const car = result.current.car.value;
    expect(car.x).toBe(start.x);
    expect(getForwardSpeed(car)).toBe(0);
    const [, , , , target] = result.current.cameraTransform.value as { translateX: number }[];
    expect(-target.translateX).toBe(car.x);
  });

  it('la carrera nueva usa las reglas y el récord vigentes', async () => {
    const { result, rerender } = await renderLoop();
    const raceConfig: RaceConfig = { ...DEFAULT_RACE_CONFIG, totalLaps: 5 };
    await rerender({ raceConfig, recordTicks: 4000 });
    // La carrera en curso no cambia.
    expect(result.current.race.value.config.totalLaps).toBe(3);
    await act(() => result.current.restart());
    expect(result.current.race.value.config.totalLaps).toBe(5);
    expect(result.current.race.value.recordTicks).toBe(4000);
  });

  it('entrega los eventos en el hilo de JS, una vez cada uno', async () => {
    const received: RaceEvent[] = [];
    const onEvents = jest.fn((events: RaceEvent[]) => received.push(...events));
    const { result } = await renderLoop({ onEvents });
    runFrames(10);
    await flush();
    expect(onEvents).not.toHaveBeenCalled();
    await startRace(result);
    await flush();
    expect(received.map((event) => event.type)).toEqual([
      'phase',
      'lightOn',
      'lightOn',
      'lightOn',
      'lightOn',
      'lightOn',
      'lightsOut',
      'phase',
    ]);
    // Ya entregados: el estado no los guarda.
    expect(result.current.race.value.events).toEqual([]);
  });

  it('manda la velocidad al motor unas 20 veces por segundo', async () => {
    const onEngine = jest.fn();
    const { result } = await renderLoop({ onEngine });
    await startRace(result);
    onEngine.mockClear();
    runFrames(60);
    await flush();
    expect(onEngine.mock.calls.length).toBeGreaterThanOrEqual(1000 / ENGINE_SAMPLE_MS - 1);
    expect(onEngine.mock.calls.length).toBeLessThanOrEqual(1000 / ENGINE_SAMPLE_MS + 1);
    const ratio = onEngine.mock.calls.at(-1)![0];
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it('calcula los fps', async () => {
    const { result } = await renderLoop();
    runFrames(10, 1000 / 90);
    expect(Math.round(result.current.fps.value)).toBe(90);
  });

  it('la cámara centra el auto en la pantalla', async () => {
    const { result } = await renderLoop();
    await startRace(result);
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

  it('la cámara se adelanta de a poco en la dirección del movimiento', async () => {
    const { result } = await renderLoop({
      cameraConfig: { ...DEFAULT_CAMERA_CONFIG, speedZoomOut: 0 },
    });
    await startRace(result);
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
  });

  it('el auto se dibuja en su posición y con su rumbo', async () => {
    const { result } = await renderLoop();
    await startRace(result);
    runFrames(20);
    const car = result.current.car.value;
    expect(result.current.carTransform.value).toEqual([
      { translateX: car.x },
      { translateY: car.z },
      { rotate: car.heading },
    ]);
  });

  it('una carrera completa en el círculo termina con la llegada', async () => {
    const received: RaceEvent[] = [];
    const { result, input } = await renderLoop({
      track: CIRCLE,
      raceConfig: { ...DEFAULT_RACE_CONFIG, totalLaps: 1 },
      onEvents: (events) => received.push(...events),
    });
    await startRace(result);
    const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
    for (let i = 0; i < 2000 && result.current.race.value.phase === 'racing'; i += 1) {
      input.set(circleAutopilot(result.current.car.value));
      callback({ timestamp: i * 16, timeSincePreviousFrame: 1000 / 60, timeSinceFirstFrame: 0 });
    }
    await flush();
    expect(result.current.race.value.phase).toBe('finished');
    const finish = received.find((event) => event.type === 'finish');
    expect(finish).toMatchObject({ lapTicks: [result.current.race.value.finishTick] });
    expect(received.filter((event) => event.type === 'newRecord')).toHaveLength(1);
  });
});
