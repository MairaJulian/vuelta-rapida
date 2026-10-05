import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import type { DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_FIXED_STEP_CONFIG, getStepMs } from '@/core/FixedStep';

import { advanceDrivingSim, createDrivingSim, getRenderCar, interpolateCar } from './DrivingSim';
import type { DrivingSimState } from './DrivingSim.types';

const stepConfig = DEFAULT_FIXED_STEP_CONFIG;
const INPUT: DrivingInput = { steer: 0.6, brake: 0 };

function runFrames(frames: number[], input: DrivingInput | ((frame: number) => DrivingInput)) {
  let sim = createDrivingSim(createCarState(0, 0, 0));
  frames.forEach((frameMs, index) => {
    const frameInput = typeof input === 'function' ? input(index) : input;
    sim = advanceDrivingSim(sim, frameMs, frameInput, DEFAULT_DRIVING_CONFIG, stepConfig);
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
    expect(createDrivingSim(car)).toEqual({ car, previousCar: car, tick: 0, accumulatorMs: 0 });
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
      stepConfig,
    );
    expect(after.previousCar).toBe(before.car);
    expect(after.tick).toBe(before.tick + 1);
  });

  it('un cuadro corto solo acumula tiempo y no mueve el auto', () => {
    const sim = runFrames(Array(10).fill(1000 / 60), INPUT);
    const next = advanceDrivingSim(sim, 4, INPUT, DEFAULT_DRIVING_CONFIG, stepConfig);
    expect(next.car).toBe(sim.car);
    expect(next.previousCar).toBe(sim.previousCar);
    expect(next.accumulatorMs).toBeCloseTo(sim.accumulatorMs + 4, 9);
  });

  it('el estado es serializable sin pérdidas', () => {
    const sim = runFrames(irregularFrames(3000), INPUT);
    const copy: DrivingSimState = JSON.parse(JSON.stringify(sim));
    expect(copy).toEqual(sim);
  });
});

describe('interpolateCar', () => {
  const previous = { x: 0, z: 0, heading: 0, vx: 0, vz: -10, steer: 0 };
  const current = { x: 2, z: -4, heading: 0.2, vx: 1, vz: -12, steer: 1 };

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
