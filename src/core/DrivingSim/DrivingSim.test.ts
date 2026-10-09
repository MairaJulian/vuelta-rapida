import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_FIXED_STEP_CONFIG, getStepMs } from '@/core/FixedStep';
import { createLapState, getCurrentLap } from '@/core/LapTimer';
import { clamp, wrapAngle } from '@/core/MathUtils';
import {
  getKerbFactor,
  getNearestOnCenterline,
  getProgressAt,
  getProgressDelta,
  getStartPose,
  getTrackProgress,
  OVAL_CIRCUIT,
} from '@/core/Track';
import type { Circuit } from '@/core/Track';
import {
  getKerbContactDistance,
  getKerbReach,
  getTrackLimit,
  NO_CONTACT,
} from '@/core/TrackBounds';

import {
  advanceDrivingSim,
  createDrivingSim,
  getRenderCar,
  interpolateCar,
  stepDrivingSim,
} from './DrivingSim';
import type { DrivingSimState } from './DrivingSim.types';

const stepConfig = DEFAULT_FIXED_STEP_CONFIG;
const track = OVAL_CIRCUIT;
const INPUT: DrivingInput = { steer: 0.6, brake: 0 };

function runFrames(frames: number[], input: DrivingInput | ((frame: number) => DrivingInput)) {
  const start = getStartPose(track);
  let sim = createDrivingSim(createCarState(start.x, start.z, start.heading));
  frames.forEach((frameMs, index) => {
    const frameInput = typeof input === 'function' ? input(index) : input;
    sim = advanceDrivingSim(sim, frameMs, frameInput, DEFAULT_DRIVING_CONFIG, track, stepConfig);
  });
  return sim;
}

/** Cuadros irregulares entre 5 y 30 ms que suman exactamente `totalMs`. */
function irregularFrames(totalMs: number): number[] {
  const frames: number[] = [];
  let seed = 7;
  let elapsed = 0;
  while (elapsed < totalMs - 30) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const frame = 5 + (seed / 2147483648) * 25;
    frames.push(frame);
    elapsed += frame;
  }
  frames.push(totalMs - elapsed);
  return frames;
}

describe('DrivingSim', () => {
  it('empieza en el tick 0 con el estado anterior igual al actual', () => {
    const car = createCarState(1, 2, 0);
    expect(createDrivingSim(car)).toEqual({
      car,
      previousCar: car,
      tick: 0,
      accumulatorMs: 0,
      trackSegment: -1,
      laps: createLapState(),
      contact: NO_CONTACT,
    });
  });

  it('la física no depende de los fps: 60 Hz, 90 Hz e irregular dan el mismo estado', () => {
    const at60 = runFrames(Array(120).fill(1000 / 60), INPUT);
    const at90 = runFrames(Array(180).fill(1000 / 90), INPUT);
    const irregular = runFrames(irregularFrames(2000), INPUT);

    expect(at60.tick).toBe(120);
    expect(at90.tick).toBe(120);
    expect(irregular.tick).toBe(120);
    expect(at90.car).toEqual(at60.car);
    expect(irregular.car).toEqual(at60.car);
  });

  it('es determinista con entradas que cambian en cada cuadro', () => {
    const frames = irregularFrames(5000);
    const input = (frame: number): DrivingInput => ({
      steer: Math.sin(frame / 7),
      brake: frame % 50 < 8 ? 1 : 0,
    });
    expect(runFrames(frames, input)).toEqual(runFrames(frames, input));
  });

  it('guarda el paso anterior para interpolar', () => {
    const before = runFrames(Array(10).fill(1000 / 60), INPUT);
    const after = advanceDrivingSim(
      before,
      getStepMs(stepConfig),
      INPUT,
      DEFAULT_DRIVING_CONFIG,
      track,
      stepConfig,
    );
    expect(after.previousCar).toBe(before.car);
    expect(after.tick).toBe(before.tick + 1);
  });

  it('un cuadro corto solo acumula tiempo y no mueve el auto', () => {
    const sim = runFrames(Array(10).fill(1000 / 60), INPUT);
    const next = advanceDrivingSim(sim, 4, INPUT, DEFAULT_DRIVING_CONFIG, track, stepConfig);
    expect(next.car).toBe(sim.car);
    expect(next.previousCar).toBe(sim.previousCar);
    expect(next.accumulatorMs).toBeCloseTo(sim.accumulatorMs + 4, 9);
  });

  it('mantiene el auto dentro de la pista en cada paso; en los pianos, hasta su borde', () => {
    // Dirección a fondo durante 10 s: sin límites, el auto saldría del óvalo.
    const limit = getTrackLimit(track, DEFAULT_DRIVING_CONFIG);
    const reach = getKerbReach(track);
    let sim = runFrames([], INPUT);
    for (const frameMs of irregularFrames(10000)) {
      sim = advanceDrivingSim(
        sim,
        frameMs,
        { steer: 1, brake: 0 },
        DEFAULT_DRIVING_CONFIG,
        track,
        stepConfig,
      );
      const hit = getNearestOnCenterline(track, sim.car.x, sim.car.z);
      const kerb = getKerbFactor(track.kerbs, track.length, getProgressAt(track, hit));
      expect(hit.distance).toBeLessThanOrEqual(limit + kerb * reach + 1e-9);
    }
  });

  it('el estado es serializable sin pérdidas', () => {
    const sim = runFrames(irregularFrames(3000), INPUT);
    const copy: DrivingSimState = JSON.parse(JSON.stringify(sim));
    expect(copy).toEqual(sim);
  });
});

/** Punto del trazado a `distance` metros de la meta. */
function pointAt(circuit: Circuit, distance: number) {
  const along = ((distance % circuit.length) + circuit.length) % circuit.length;
  let low = 0;
  let high = circuit.distances.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (circuit.distances[middle] <= along) low = middle;
    else high = middle - 1;
  }
  const a = circuit.centerline[low];
  const b = circuit.centerline[(low + 1) % circuit.centerline.length];
  const end = circuit.distances[low + 1] ?? circuit.length;
  const t = (along - circuit.distances[low]) / (end - circuit.distances[low]);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/** Piloto automático simple: apunta a un punto del trazado 10 m más adelante. */
function autopilot(circuit: Circuit, car: CarState, progress: number): DrivingInput {
  const target = pointAt(circuit, progress + 10);
  const desired = Math.atan2(target.x - car.x, car.z - target.z);
  return { steer: clamp(wrapAngle(desired - car.heading) * 4, -1, 1), brake: 0 };
}

/** Corre `steps` pasos con el piloto automático; anota el progreso del auto en cada uno. */
function driveWithAutopilot(circuit: Circuit, config: DrivingConfig, steps: number) {
  const start = getStartPose(circuit);
  let sim = createDrivingSim(createCarState(start.x, start.z, start.heading));
  let progress = getTrackProgress(circuit, start.x, start.z);
  const progresses: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    const input = autopilot(circuit, sim.car, progress);
    sim = advanceDrivingSim(sim, getStepMs(stepConfig), input, config, circuit, stepConfig);
    progress = sim.laps.progress!;
    progresses.push(progress);
  }
  return { sim, progresses };
}

describe('DrivingSim: progreso y vueltas', () => {
  it('cuenta las vueltas con los pasos exactos entre cruces de la meta', () => {
    // Óvalo a velocidad máxima: unos 17 s por vuelta; 2600 pasos dan dos vueltas completas.
    const { sim, progresses } = driveWithAutopilot(track, DEFAULT_DRIVING_CONFIG, 2600);
    // Cruces de la meta detectados aparte: el progreso pasa del final de la vuelta al principio.
    const crossings = progresses.flatMap((progress, i) =>
      i > 0 && progresses[i - 1] > track.length / 2 && progress < track.length / 2 ? [i + 1] : [],
    );
    expect(crossings.length).toBeGreaterThanOrEqual(3);
    expect(sim.laps.lapStartTick).toBe(crossings.at(-1));
    expect(sim.laps.lapTicks).toEqual(crossings.slice(1).map((tick, i) => tick - crossings[i]));
    expect(sim.laps.bestLapTicks).toBe(Math.min(...sim.laps.lapTicks));
  });

  it('en el Autódromo del Lago, el progreso aumenta sin saltos y la vuelta se cuenta', () => {
    // Más lento, para que el piloto automático tome la chicana y la horquilla sin frenar.
    const config = { ...DEFAULT_DRIVING_CONFIG, maxSpeed: 16 };
    const { sim, progresses } = driveWithAutopilot(DEFAULT_CIRCUIT, config, 10000);
    let travelled = 0;
    progresses.forEach((progress, i) => {
      if (i === 0) return;
      const delta = getProgressDelta(progresses[i - 1], progress, DEFAULT_CIRCUIT.length);
      // Hacia adelante y sin saltos. Por dentro de la curva más cerrada (11 m de radio,
      // con el auto a 6 m del centro) el progreso avanza unas 2 veces lo que el auto.
      expect(delta).toBeGreaterThanOrEqual(0);
      expect(delta).toBeLessThan((config.maxSpeed / 60) * 3);
      travelled += delta;
    });
    expect(travelled).toBeGreaterThan(DEFAULT_CIRCUIT.length);
    expect(getCurrentLap(sim.laps)).toBe(2);
    expect(sim.laps.lapTicks).toHaveLength(1);
  });

  it('la búsqueda del paso empieza en el segmento del paso anterior', () => {
    const sim = runFrames(Array(30).fill(1000 / 60), INPUT);
    expect(sim.trackSegment).toBe(getNearestOnCenterline(track, sim.car.x, sim.car.z).segment);
  });
});

describe('stepDrivingSim: bordes y pianos', () => {
  const dt = 1 / stepConfig.stepHz;
  const STILL: DrivingInput = { steer: 0, brake: 1 };

  /** Un paso desde un auto puesto a mano, con la búsqueda completa del punto más cercano. */
  function stepFrom(car: CarState, input: DrivingInput = STILL) {
    return stepDrivingSim(createDrivingSim(car), input, DEFAULT_DRIVING_CONFIG, track, dt);
  }

  it('avanza un paso y no toca el tiempo acumulado', () => {
    const sim = { ...createDrivingSim(createCarState(0, -50, Math.PI / 2)), accumulatorMs: 3 };
    const next = stepDrivingSim(sim, INPUT, DEFAULT_DRIVING_CONFIG, track, dt);
    expect(next.tick).toBe(1);
    expect(next.previousCar).toBe(sim.car);
    expect(next.accumulatorMs).toBe(3);
  });

  it('en la recta, pasar el borde es un toque con la velocidad hacia afuera como golpe', () => {
    // Recta de arriba del óvalo (z = -50): el auto va hacia afuera (-z) a 10 m/s.
    const car = { ...createCarState(0, -56.5, 0), vz: -10 };
    const { contact, car: after } = stepFrom(car, { steer: 0, brake: 0 });
    expect(contact.touching).toBe(true);
    expect(contact.onKerb).toBe(false);
    expect(contact.impactSpeed).toBeGreaterThan(9);
    expect(getNearestOnCenterline(track, after.x, after.z).distance).toBeCloseTo(
      getTrackLimit(track, DEFAULT_DRIVING_CONFIG),
      9,
    );
  });

  it('adentro del asfalto no hay contacto', () => {
    expect(stepFrom(createCarState(0, -50, Math.PI / 2)).contact).toEqual(NO_CONTACT);
  });

  it('en la curva, el auto puede pisar el piano sin tocar el límite', () => {
    // Mitad de la curva derecha (radio 50, centro en x = 100): afuera es +x.
    const distance = (getKerbContactDistance(track, DEFAULT_DRIVING_CONFIG) + 7.7) / 2;
    expect(distance).toBeGreaterThan(getTrackLimit(track, DEFAULT_DRIVING_CONFIG));
    const { contact, car } = stepFrom(createCarState(150 + distance, 0, Math.PI));
    expect(contact).toEqual({ touching: false, impactSpeed: 0, onKerb: true });
    expect(car.x).toBeCloseTo(150 + distance, 9);
  });

  it('en la curva, el límite es el borde exterior del piano', () => {
    const { contact, car } = stepFrom(createCarState(150 + 9, 0, Math.PI));
    expect(contact.touching).toBe(true);
    expect(contact.onKerb).toBe(true);
    const limit = getTrackLimit(track, DEFAULT_DRIVING_CONFIG) + getKerbReach(track);
    expect(car.x - 150).toBeCloseTo(limit, 9);
  });
});

describe('interpolateCar', () => {
  const previous = { x: 0, z: 0, heading: 0, vx: 0, vz: -10, steer: 0, reverseTimer: 0 };
  const current = { x: 2, z: -4, heading: 0.2, vx: 1, vz: -12, steer: 1, reverseTimer: 0 };

  it('devuelve los extremos con alpha 0 y 1', () => {
    expect(interpolateCar(previous, current, 0)).toEqual(previous);
    expect(interpolateCar(previous, current, 1)).toEqual(current);
  });

  it('interpola en el medio', () => {
    const middle = interpolateCar(previous, current, 0.5);
    expect(middle.x).toBe(1);
    expect(middle.z).toBe(-2);
    expect(middle.heading).toBeCloseTo(0.1, 12);
  });

  it('el rumbo cruza ±π por el arco corto', () => {
    const a = { ...previous, heading: Math.PI - 0.05 };
    const b = { ...previous, heading: -Math.PI + 0.05 };
    expect(Math.abs(interpolateCar(a, b, 0.5).heading)).toBeCloseTo(Math.PI, 12);
  });
});

describe('getRenderCar', () => {
  it('interpola según el tiempo acumulado', () => {
    const sim = runFrames(Array(10).fill(1000 / 60), INPUT);
    const halfStep = { ...sim, accumulatorMs: getStepMs(stepConfig) / 2 };
    const drawn = getRenderCar(halfStep, stepConfig);
    expect(drawn.z).toBeCloseTo((sim.previousCar.z + sim.car.z) / 2, 9);
  });
});
