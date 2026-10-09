import {
  createCarState,
  DEFAULT_DRIVING_CONFIG,
  getForwardSpeed,
  getSpeed,
  stepCar,
} from '@/core/DrivingModel';
import type { CarState, DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { getNearestOnCenterline, getStartPose, OVAL_TRACK } from '@/core/Track';
import type { TrackData } from '@/core/Track';

import {
  constrainToHit,
  constrainToTrack,
  getKerbContactDistance,
  getKerbReach,
  getTrackLimit,
  NO_CONTACT,
  resolveTrackContact,
} from './TrackBounds';

const DT = 1 / 60;
const config = DEFAULT_DRIVING_CONFIG;
const track = OVAL_TRACK;
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
    for (const [seed, onTrack, steps] of [
      [1, track, 6000],
      [2, track, 6000],
      [3, { ...track, width: 5 }, 6000],
      // También en el circuito del juego, con la chicana y la horquilla.
      [4, DEFAULT_CIRCUIT, 2400],
      [5, DEFAULT_CIRCUIT, 2400],
    ] as const) {
      const trackLimit = getTrackLimit(onTrack, config);
      const start = getStartPose(onTrack);
      let car = createCarState(start.x, start.z, start.heading);
      let touched = false;
      for (const input of seededHeldInputs(seed, steps)) {
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

  it('constrainToHit con el punto ya buscado da lo mismo que constrainToTrack', () => {
    const car = { ...createCarState(30, -50 - limit - 2, Math.PI / 2), vx: 10, vz: -3 };
    const hit = getNearestOnCenterline(track, car.x, car.z);
    expect(constrainToHit(car, hit, track, config, DT)).toEqual(
      constrainToTrack(car, track, config, DT),
    );
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

describe('pianos: getKerbReach y getKerbContactDistance', () => {
  it('el piano se puede pisar hasta su borde exterior (138/110 del asfalto)', () => {
    expect(getKerbReach(track)).toBeCloseTo(7 * (138 / 110 - 1), 12);
  });

  it('la carrocería pisa el piano después del borde blanco (120/110)', () => {
    expect(getKerbContactDistance(track, config)).toBeCloseTo(
      7 * (120 / 110) - config.collisionRadius,
      12,
    );
    // Sin piano, el auto no llega: el límite del asfalto está antes.
    expect(getKerbContactDistance(track, config)).toBeGreaterThan(limit);
  });
});

describe('resolveTrackContact', () => {
  /** Auto en la recta superior (afuera es -z), a `distance` del trazado. */
  const carAt = (distance: number, vz = 0) => ({
    ...createCarState(30, -50 - distance, Math.PI / 2),
    vx: 10,
    vz,
  });
  const hitOf = (car: CarState) => getNearestOnCenterline(track, car.x, car.z);

  it('sin piano, corrige igual que constrainToHit y cuenta el golpe', () => {
    const car = carAt(limit + 1, -4);
    const result = resolveTrackContact(car, hitOf(car), track, config, DT);
    expect(result.car).toEqual(constrainToHit(car, hitOf(car), track, config, DT));
    expect(result.contact).toEqual({ touching: true, impactSpeed: 4, onKerb: false });
  });

  it('si ya vuelve hacia adentro, toca pero sin golpe', () => {
    const car = carAt(limit + 1, 3);
    expect(resolveTrackContact(car, hitOf(car), track, config, DT).contact.impactSpeed).toBe(0);
  });

  it('adentro y sin piano no hay contacto', () => {
    const car = carAt(limit - 1);
    const result = resolveTrackContact(car, hitOf(car), track, config, DT);
    expect(result.car).toBe(car);
    expect(result.contact).toEqual(NO_CONTACT);
  });

  it('con el piano a pleno, pasar el asfalto no es un toque y cuenta como piano', () => {
    const car = carAt(limit + 1);
    const result = resolveTrackContact(car, hitOf(car), track, config, DT, 1);
    expect(result.car).toBe(car);
    expect(result.contact).toEqual({ touching: false, impactSpeed: 0, onKerb: true });
  });

  it('sobre el piano pero antes del borde blanco, todavía no lo pisa', () => {
    const car = carAt((limit + getKerbContactDistance(track, config)) / 2);
    expect(resolveTrackContact(car, hitOf(car), track, config, DT, 1).contact.onKerb).toBe(false);
  });

  it('con el piano, el límite es su borde exterior', () => {
    const car = carAt(limit + getKerbReach(track) + 1, -2);
    const result = resolveTrackContact(car, hitOf(car), track, config, DT, 1);
    expect(offset(result.car)).toBeCloseTo(limit + getKerbReach(track), 9);
    expect(result.contact).toEqual({ touching: true, impactSpeed: 2, onKerb: true });
  });

  it('en la punta del piano el límite crece con el factor', () => {
    const car = carAt(limit + 1.5, -2);
    const result = resolveTrackContact(car, hitOf(car), track, config, DT, 0.5);
    expect(offset(result.car)).toBeCloseTo(limit + getKerbReach(track) / 2, 9);
    expect(result.contact.touching).toBe(true);
  });

  it('el contacto es serializable', () => {
    const car = carAt(limit + 1, -4);
    const { contact } = resolveTrackContact(car, hitOf(car), track, config, DT, 1);
    expect(JSON.parse(JSON.stringify(contact))).toEqual(contact);
  });
});
