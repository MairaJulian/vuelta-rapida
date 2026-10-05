import {
  clampDrivingInput,
  createCarState,
  DEFAULT_DRIVING_CONFIG,
  getDriftSpeed,
  getForwardSpeed,
  getSpeed,
  getTurnAuthority,
  stepCar,
} from './DrivingModel';
import type { CarState, DrivingConfig, DrivingInput } from './DrivingModel.types';

const DT = 1 / 60;
const config = DEFAULT_DRIVING_CONFIG;
const THROTTLE: DrivingInput = { steer: 0, brake: 0 };
const FULL_BRAKE: DrivingInput = { steer: 0, brake: 1 };

function run(
  car: CarState,
  steps: number,
  input: DrivingInput | ((step: number) => DrivingInput),
  drivingConfig: DrivingConfig = config,
): CarState {
  let state = car;
  for (let step = 0; step < steps; step += 1) {
    const stepInput = typeof input === 'function' ? input(step) : input;
    state = stepCar(state, stepInput, drivingConfig, DT);
  }
  return state;
}

/** Auto a velocidad máxima en línea recta, mirando hacia -z. */
function carAtTopSpeed(): CarState {
  return { ...createCarState(0, 0, 0), vz: -config.maxSpeed };
}

/** Generador pseudoaleatorio con semilla (LCG): misma semilla, misma secuencia. */
function seededInputs(seed: number) {
  let value = seed;
  const next = () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
  const inputs: DrivingInput[] = [];
  for (let i = 0; i < 3000; i += 1) {
    inputs.push({ steer: next() * 2 - 1, brake: next() < 0.2 ? next() : 0 });
  }
  return inputs;
}

describe('clampDrivingInput', () => {
  it('limita dirección a [-1, 1] y freno a [0, 1]', () => {
    expect(clampDrivingInput({ steer: 3, brake: -2 })).toEqual({ steer: 1, brake: 0 });
    expect(clampDrivingInput({ steer: -3, brake: 5 })).toEqual({ steer: -1, brake: 1 });
  });

  it('convierte valores no finitos en 0', () => {
    expect(clampDrivingInput({ steer: Number.NaN, brake: Infinity })).toEqual({
      steer: 0,
      brake: 0,
    });
  });
});

describe('stepCar', () => {
  it('acelera solo desde parado y avanza hacia -z con rumbo 0', () => {
    const car = run(createCarState(0, 0, 0), 60, THROTTLE);
    expect(getForwardSpeed(car)).toBeGreaterThan(10);
    expect(car.z).toBeLessThan(0);
    expect(car.x).toBeCloseTo(0, 9);
    expect(car.heading).toBe(0);
  });

  it('la aceleración es progresiva: gana menos velocidad cerca del máximo', () => {
    const early = getForwardSpeed(run(createCarState(0, 0, 0), 30, THROTTLE));
    const later = run(createCarState(0, 0, 0), 300, THROTTLE);
    const gainLate = getForwardSpeed(run(later, 30, THROTTLE)) - getForwardSpeed(later);
    expect(gainLate).toBeLessThan(early);
  });

  it('no supera la velocidad máxima', () => {
    let car = createCarState(0, 0, 0);
    for (let step = 0; step < 60 * 60; step += 1) {
      const steer = Math.sin(step / 40);
      car = stepCar(car, { steer, brake: 0 }, config, DT);
      expect(getForwardSpeed(car)).toBeLessThanOrEqual(config.maxSpeed);
      expect(getSpeed(car)).toBeLessThanOrEqual(config.maxSpeed + 1e-9);
    }
  });

  it('no gira detenido', () => {
    const start = createCarState(5, 5, 0.3);
    const car = run(start, 120, { steer: 1, brake: 1 });
    expect(car.heading).toBe(start.heading);
    expect(car.x).toBe(start.x);
    expect(car.z).toBe(start.z);
  });

  it('gira hacia la derecha con dirección positiva', () => {
    // Medio segundo: gira bastante menos de media vuelta, así el rumbo no se normaliza.
    const right = run(createCarState(0, 0, 0), 30, { steer: 1, brake: 0 });
    const left = run(createCarState(0, 0, 0), 30, { steer: -1, brake: 0 });
    expect(right.heading).toBeGreaterThan(0);
    expect(left.heading).toBeCloseTo(-right.heading, 12);
  });

  it('frena hasta detenerse y no da marcha atrás', () => {
    let car = carAtTopSpeed();
    let stoppedAt = -1;
    for (let step = 0; step < 60 * 5; step += 1) {
      car = stepCar(car, FULL_BRAKE, config, DT);
      if (stoppedAt < 0 && getSpeed(car) === 0) {
        stoppedAt = step;
      }
    }
    expect(stoppedAt).toBeGreaterThan(0);
    // A 25 m/s² desde 50 m/s tarda menos de 2 s (la resistencia ayuda).
    expect(stoppedAt).toBeLessThanOrEqual(120);
    expect(getSpeed(car)).toBe(0);

    const parked = run(car, 60, FULL_BRAKE);
    expect(parked).toEqual(car);
  });

  it('el freno parcial frena menos que a fondo', () => {
    const half = run(carAtTopSpeed(), 30, { steer: 0, brake: 0.5 });
    const full = run(carAtTopSpeed(), 30, FULL_BRAKE);
    expect(getSpeed(half)).toBeGreaterThan(getSpeed(full));
  });

  it('derrapa al girar rápido y recupera el agarre al enderezar', () => {
    const turning = run(carAtTopSpeed(), 30, { steer: 1, brake: 0 });
    expect(Math.abs(getDriftSpeed(turning))).toBeGreaterThan(1);

    const straight = run(turning, 60, THROTTLE);
    expect(Math.abs(getDriftSpeed(straight))).toBeLessThan(0.05);
  });

  it('con menos agarre derrapa más', () => {
    const lowGrip = { ...config, lateralGrip: 2 };
    const grippy = run(carAtTopSpeed(), 30, { steer: 1, brake: 0 });
    const slippery = run(carAtTopSpeed(), 30, { steer: 1, brake: 0 }, lowGrip);
    expect(Math.abs(getDriftSpeed(slippery))).toBeGreaterThan(Math.abs(getDriftSpeed(grippy)));
  });

  it('la dirección aplicada sigue a la entrada a ritmo limitado', () => {
    const car = stepCar(createCarState(0, 0, 0), { steer: 1, brake: 0 }, config, DT);
    expect(car.steer).toBeCloseTo(config.steerRate * DT, 12);
  });

  it('no cambia nada con dt cero o negativo', () => {
    const car = carAtTopSpeed();
    expect(stepCar(car, THROTTLE, config, 0)).toBe(car);
    expect(stepCar(car, THROTTLE, config, -1)).toBe(car);
  });

  it('es determinista: la misma secuencia de entradas da exactamente el mismo estado', () => {
    const inputs = seededInputs(42);
    const first = run(createCarState(10, -20, 1), inputs.length, (i) => inputs[i]);
    const second = run(createCarState(10, -20, 1), inputs.length, (i) => inputs[i]);
    expect(second).toEqual(first);
    expect(Object.is(second.x, first.x)).toBe(true);
    expect(Object.is(second.heading, first.heading)).toBe(true);
  });

  it('el estado es serializable sin pérdidas', () => {
    const car = run(createCarState(0, 0, 0), 200, (i) => ({ steer: Math.cos(i), brake: 0 }));
    expect(JSON.parse(JSON.stringify(car))).toEqual(car);
  });
});

describe('getTurnAuthority', () => {
  it('es 0 detenido y 1 a la velocidad de giro completo', () => {
    expect(getTurnAuthority(0, config)).toBe(0);
    expect(getTurnAuthority(config.fullTurnSpeed, config)).toBe(1);
  });

  it('crece con la velocidad a baja velocidad', () => {
    expect(getTurnAuthority(config.fullTurnSpeed / 2, config)).toBeCloseTo(0.5, 12);
  });

  it('cae hasta highSpeedTurnFactor a velocidad máxima', () => {
    expect(getTurnAuthority(config.maxSpeed, config)).toBeCloseTo(config.highSpeedTurnFactor, 12);
  });

  it('no divide por cero si maxSpeed no supera fullTurnSpeed', () => {
    const odd = { ...config, maxSpeed: 5, fullTurnSpeed: 8 };
    expect(getTurnAuthority(10, odd)).toBe(1);
  });
});
