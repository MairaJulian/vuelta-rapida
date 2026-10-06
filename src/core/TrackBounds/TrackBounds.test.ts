import {
  createCarState,
  DEFAULT_DRIVING_CONFIG,
  getForwardSpeed,
  getSpeed,
  stepCar,
} from '@/core/DrivingModel';
import type { CarState, DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_TRACK, getNearestOnCenterline, getStartPose } from '@/core/Track';
import type { TrackData } from '@/core/Track';

import { constrainToTrack, getTrackLimit } from './TrackBounds';

const DT = 1 / 60;
const config = DEFAULT_DRIVING_CONFIG;
const track = DEFAULT_TRACK;
const limit = getTrackLimit(track, config);

/** Un paso de simulación con el límite de pista, como en DrivingSim. */
function stepOnTrack(car: CarState, input: DrivingInput, onTrack: TrackData = track): CarState {
  return constrainToTrack(stepCar(car, input, config, DT), onTrack, config, DT);
}

/** Distancia del auto al trazado central. */
const offset = (car: CarState, onTrack: TrackData = track) =>
  getNearestOnCenterline(onTrack, car.x, car.z).distance;

/** Entradas pseudoaleatorias con semilla fija, mantenidas en tramos de 0,1 a 2 s. */
function seededHeldInputs(seed: number, count: number): DrivingInput[] {
  let value = seed;
  const next = () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
  const inputs: DrivingInput[] = [];
  while (inputs.length < count) {
    const input = { steer: next() * 2 - 1, brake: next() < 0.25 ? 1 : 0 };
    const steps = 6 + Math.floor(next() * 114);
    for (let i = 0; i < steps; i += 1) {
      inputs.push(input);
    }
  }
  return inputs.slice(0, count);
}

/** Auto en la largada a velocidad máxima, apuntando 20° hacia afuera de la recta superior. */
function carHeadingToWall(): CarState {
  const start = getStartPose(track);
  const heading = start.heading - 0.35;
  return {
    ...createCarState(start.x, start.z, heading),
    vx: Math.sin(heading) * config.maxSpeed,
    vz: -Math.cos(heading) * config.maxSpeed,
  };
}

describe('getTrackLimit', () => {
  it('es medio ancho menos el radio del auto', () => {
    expect(getTrackLimit(track, config)).toBe(track.width / 2 - config.collisionRadius);
  });

  it('nunca es negativo', () => {
    expect(getTrackLimit({ ...track, width: 1 }, config)).toBe(0);
  });
});

describe('constrainToTrack', () => {
  it('dentro de la pista no cambia nada', () => {
    const car = { ...createCarState(30, -52, 1), vx: 10 };
    expect(constrainToTrack(car, track, config, DT)).toBe(car);
  });

  it('fuera, vuelve al borde y pierde la velocidad hacia afuera sin rebotar', () => {
    // Recta superior: afuera es -z.
    const car = { ...createCarState(30, -60, 1), vx: 20, vz: -5 };
    const constrained = constrainToTrack(car, track, config, DT);
    const friction = Math.exp(-config.wallFriction * DT);
    expect(constrained.x).toBeCloseTo(30, 12);
    expect(constrained.z).toBeCloseTo(-50 - limit, 12);
    expect(constrained.vx).toBeCloseTo(20 * friction, 12);
    expect(constrained.vz).toBeCloseTo(0, 12);
  });

  it('si ya vuelve hacia adentro, conserva esa velocidad (menos el roce)', () => {
    const car = { ...createCarState(30, -60, 1), vx: 0, vz: 5 };
    const constrained = constrainToTrack(car, track, config, DT);
    expect(constrained.vz).toBeCloseTo(5 * Math.exp(-config.wallFriction * DT), 12);
  });

  it('con entradas aleatorias de semilla fija, el auto nunca sale de los límites', () => {
    for (const [seed, onTrack] of [
      [1, track],
      [2, track],
      [3, { ...track, width: 5 }],
    ] as const) {
      const trackLimit = getTrackLimit(onTrack, config);
      const start = getStartPose(onTrack);
      let car = createCarState(start.x, start.z, start.heading);
      let touched = false;
      for (const input of seededHeldInputs(seed, 6000)) {
        car = stepOnTrack(car, input, onTrack);
        const distance = offset(car, onTrack);
        expect(distance).toBeLessThanOrEqual(trackLimit + 1e-9);
        touched ||= distance > trackLimit - 1e-6;
      }
      // La prueba solo vale si el auto llegó a tocar el borde.
      expect(touched).toBe(true);
    }
  });

  it('el contacto con el borde reduce la velocidad', () => {
    const wide = { ...track, width: 200 };
    let walled = carHeadingToWall();
    let free = carHeadingToWall();
    for (let step = 0; step < 120; step += 1) {
      walled = stepOnTrack(walled, { steer: 0, brake: 0 }, track);
      free = stepOnTrack(free, { steer: 0, brake: 0 }, wide);
    }
    expect(offset(free, wide)).toBeLessThan(getTrackLimit(wide, config));
    expect(getSpeed(walled)).toBeLessThan(getSpeed(free) * 0.8);
  });

  it('al tocar el borde se desliza a lo largo de él, sin rebotar hacia adentro', () => {
    let car = carHeadingToWall();
    const startX = car.x;
    for (let step = 0; step < 120; step += 1) {
      car = stepOnTrack(car, { steer: 0, brake: 0 });
      if (offset(car) > limit - 1e-6) {
        // Recta superior: hacia adentro es +z. En el borde, la velocidad nunca apunta hacia adentro.
        expect(car.vz).toBeLessThanOrEqual(1e-9);
      }
    }
    expect(offset(car)).toBeCloseTo(limit, 9);
    expect(car.x - startX).toBeGreaterThan(40);
    expect(getForwardSpeed(car)).toBeGreaterThan(0);
  });

  it('es determinista y serializable', () => {
    const inputs = seededHeldInputs(9, 3000);
    const run = () => {
      const start = getStartPose(track);
      let car = createCarState(start.x, start.z, start.heading);
      for (const input of inputs) {
        car = stepOnTrack(car, input);
      }
      return car;
    };
    const first = run();
    expect(run()).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });
});
