import {
  approachSteer,
  clampDrivingInput,
  createCarState,
  DEFAULT_DRIVING_CONFIG,
  getDriftSpeed,
  getForwardSpeed,
  getMaxSteerAngle,
  getSpeed,
  getTurnRate,
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

/** Pasos que entran en `seconds` segundos de simulación. */
const stepsIn = (seconds: number) => Math.round(seconds / DT);

/** Auto a velocidad máxima en línea recta, mirando hacia -z. */
function carAtTopSpeed(): CarState {
  return { ...createCarState(0, 0, 0), vz: -config.maxSpeed };
}

/** Auto que va hacia delante a `speed` m/s, mirando hacia -z. */
function carAt(speed: number): CarState {
  return { ...createCarState(0, 0, 0), vz: -speed };
}

/** Frena desde velocidad máxima hasta detenerse. Devuelve el auto y cuántos pasos tardó. */
function brakeToStop(): { car: CarState; steps: number } {
  let car = carAtTopSpeed();
  for (let step = 1; step <= stepsIn(5); step += 1) {
    car = stepCar(car, FULL_BRAKE, config, DT);
    if (getSpeed(car) === 0) {
      return { car, steps: step };
    }
  }
  throw new Error('No se detuvo en 5 s');
}

/** Generador pseudoaleatorio con semilla (LCG): misma semilla, misma secuencia. */
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/** 3000 entradas que cambian en cada paso. */
function seededInputs(seed: number) {
  const next = seededRandom(seed);
  const inputs: DrivingInput[] = [];
  for (let i = 0; i < 3000; i += 1) {
    inputs.push({ steer: next() * 2 - 1, brake: next() < 0.2 ? next() : 0 });
  }
  return inputs;
}

/** 3000 entradas en tramos de 0,1 a 2 s, con frenadas largas que llegan a la marcha atrás. */
function seededHeldInputs(seed: number) {
  const next = seededRandom(seed);
  const inputs: DrivingInput[] = [];
  while (inputs.length < 3000) {
    const input = { steer: Math.round(next() * 2 - 1), brake: next() < 0.35 ? 1 : 0 };
    const steps = 6 + Math.floor(next() * 114);
    for (let i = 0; i < steps; i += 1) {
      inputs.push(input);
    }
  }
  return inputs.slice(0, 3000);
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
    // Una pausa larga para que no llegue a la marcha atrás.
    const car = run(start, 120, { steer: 1, brake: 1 }, { ...config, reverseDelay: 10 });
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

  it('a velocidad alta gira menos por metro recorrido que a velocidad baja', () => {
    // Curvatura: cuánto cambia el rumbo por metro recorrido. Es la inversa del radio de giro.
    const curvature = (start: CarState) => {
      const end = run(start, 30, { steer: 1, brake: 0 });
      const distance = Math.hypot(end.x - start.x, end.z - start.z);
      return end.heading / distance;
    };
    expect(curvature(carAtTopSpeed())).toBeLessThan(curvature(carAt(10)) / 3);
  });

  it('el freno parcial frena menos que a fondo', () => {
    const half = run(carAtTopSpeed(), 30, { steer: 0, brake: 0.5 });
    const full = run(carAtTopSpeed(), 30, FULL_BRAKE);
    expect(getSpeed(half)).toBeGreaterThan(getSpeed(full));
  });

  it('con el freno mantenido se detiene, espera la pausa y luego retrocede', () => {
    const { car: stopped, steps } = brakeToStop();
    // A 25 m/s² desde 42 m/s tarda menos de 2 s (la resistencia ayuda).
    expect(steps).toBeLessThanOrEqual(stepsIn(2));

    // Durante la pausa sigue detenido.
    const waiting = run(stopped, stepsIn(config.reverseDelay) - 1, FULL_BRAKE);
    expect(getSpeed(waiting)).toBe(0);

    // Pasada la pausa, retrocede sin pasar de la velocidad de reversa.
    let car = waiting;
    for (let step = 0; step < stepsIn(3); step += 1) {
      car = stepCar(car, FULL_BRAKE, config, DT);
      expect(getForwardSpeed(car)).toBeGreaterThanOrEqual(-config.maxReverseSpeed);
    }
    expect(getForwardSpeed(car)).toBeCloseTo(-config.maxReverseSpeed, 9);
    // Mirando hacia -z, retroceder es avanzar en +z.
    expect(car.z).toBeGreaterThan(stopped.z);
  });

  it('al soltar el freno en marcha atrás vuelve a avanzar', () => {
    const reversing = run(brakeToStop().car, stepsIn(2), FULL_BRAKE);
    expect(getForwardSpeed(reversing)).toBeLessThan(0);

    const released = stepCar(reversing, THROTTLE, config, DT);
    expect(released.reverseTimer).toBe(0);
    const driving = run(released, stepsIn(1), THROTTLE);
    expect(getForwardSpeed(driving)).toBeGreaterThan(5);
  });

  it('una frenada más corta que la pausa no da marcha atrás', () => {
    const { car: stopped } = brakeToStop();
    let car = run(stopped, stepsIn(config.reverseDelay / 2), FULL_BRAKE);
    for (let step = 0; step < stepsIn(1); step += 1) {
      car = stepCar(car, THROTTLE, config, DT);
      expect(getForwardSpeed(car)).toBeGreaterThanOrEqual(0);
    }
  });

  it('en marcha atrás la dirección se invierte como en un auto real', () => {
    const reversing = run(brakeToStop().car, stepsIn(2), FULL_BRAKE);
    const turned = run(reversing, 30, { steer: 1, brake: 1 });
    // Con la dirección a la derecha, la trompa va hacia la izquierda y la cola, hacia la derecha (+x).
    expect(turned.heading).toBeLessThan(reversing.heading);
    expect(turned.x).toBeGreaterThan(reversing.x);
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

  it('la dirección aplicada crece con una rampa hasta la entrada', () => {
    const car = stepCar(createCarState(0, 0, 0), { steer: 1, brake: 0 }, config, DT);
    expect(car.steer).toBeCloseTo(DT / config.steerInTime, 12);
  });

  it('no cambia nada con dt cero o negativo', () => {
    const car = carAtTopSpeed();
    expect(stepCar(car, THROTTLE, config, 0)).toBe(car);
    expect(stepCar(car, THROTTLE, config, -1)).toBe(car);
  });

  it('es determinista: la misma secuencia de entradas da exactamente el mismo estado', () => {
    for (const inputs of [seededInputs(42), seededHeldInputs(7)]) {
      const first = run(createCarState(10, -20, 1), inputs.length, (i) => inputs[i]);
      const second = run(createCarState(10, -20, 1), inputs.length, (i) => inputs[i]);
      expect(second).toEqual(first);
      expect(Object.is(second.x, first.x)).toBe(true);
      expect(Object.is(second.heading, first.heading)).toBe(true);
    }
  });

  it('las secuencias con frenadas largas llegan a la marcha atrás', () => {
    const inputs = seededHeldInputs(7);
    let car = createCarState(0, 0, 0);
    let reversed = false;
    for (const input of inputs) {
      car = stepCar(car, input, config, DT);
      reversed ||= getForwardSpeed(car) < 0;
    }
    expect(reversed).toBe(true);
  });

  it('el estado es serializable sin pérdidas', () => {
    const car = run(createCarState(0, 0, 0), 200, (i) => ({ steer: Math.cos(i), brake: 0 }));
    expect(JSON.parse(JSON.stringify(car))).toEqual(car);
  });
});

describe('getMaxSteerAngle', () => {
  it('es el máximo detenido y la fracción configurada a velocidad máxima', () => {
    expect(getMaxSteerAngle(0, config)).toBe(config.maxSteerAngle);
    expect(getMaxSteerAngle(config.maxSpeed, config)).toBeCloseTo(
      config.maxSteerAngle * config.highSpeedSteerFactor,
      12,
    );
  });

  it('disminuye a medida que la velocidad aumenta', () => {
    let previous = Infinity;
    for (let speed = 0; speed <= config.maxSpeed; speed += 2) {
      const angle = getMaxSteerAngle(speed, config);
      expect(angle).toBeLessThan(previous);
      previous = angle;
    }
  });

  it('vale lo mismo en marcha atrás', () => {
    expect(getMaxSteerAngle(-5, config)).toBe(getMaxSteerAngle(5, config));
  });

  it('la curva es configurable: con exponente bajo recorta antes', () => {
    const middle = config.maxSpeed / 2;
    const early = getMaxSteerAngle(middle, { ...config, steerFalloff: 0.5 });
    const linear = getMaxSteerAngle(middle, { ...config, steerFalloff: 1 });
    const late = getMaxSteerAngle(middle, { ...config, steerFalloff: 2 });
    expect(early).toBeLessThan(linear);
    expect(linear).toBeLessThan(late);
  });

  it('no divide por cero con maxSpeed 0', () => {
    const angle = getMaxSteerAngle(10, { ...config, maxSpeed: 0 });
    expect(angle).toBeCloseTo(config.maxSteerAngle * config.highSpeedSteerFactor, 12);
  });
});

describe('getTurnRate', () => {
  it('es 0 detenido', () => {
    expect(getTurnRate(0, 1, config)).toBe(0);
  });

  it('invierte el sentido en marcha atrás', () => {
    expect(getTurnRate(5, 1, config)).toBeGreaterThan(0);
    expect(getTurnRate(-5, 1, config)).toBeCloseTo(-getTurnRate(5, 1, config), 12);
  });

  it('el radio de giro crece con la velocidad', () => {
    const radius = (speed: number) => speed / getTurnRate(speed, 1, config);
    expect(radius(config.maxSpeed)).toBeGreaterThan(radius(20));
    expect(radius(20)).toBeGreaterThan(radius(5));
  });

  it('no gira con distancia entre ejes 0', () => {
    expect(getTurnRate(10, 1, { ...config, wheelbase: 0 })).toBe(0);
  });
});

describe('approachSteer', () => {
  // Tiempos que son un número entero de pasos: 12 para girar y 6 para volver.
  const rampConfig = { ...config, steerInTime: 0.2, steerReturnTime: 0.1 };

  /** Aplica la rampa durante `steps` pasos de DT. */
  function ramp(from: number, to: number, steps: number) {
    let steer = from;
    for (let step = 0; step < steps; step += 1) {
      steer = approachSteer(steer, to, rampConfig, DT);
    }
    return steer;
  }

  it('llega a fondo en steerInTime y no antes', () => {
    expect(ramp(0, 1, 6)).toBeCloseTo(0.5, 9);
    expect(ramp(0, 1, 11)).toBeLessThan(1);
    expect(ramp(0, 1, 13)).toBe(1);
    expect(ramp(0, -1, 13)).toBe(-1);
  });

  it('vuelve al centro en steerReturnTime, más rápido que al girar', () => {
    expect(ramp(1, 0, 3)).toBeCloseTo(0.5, 9);
    expect(ramp(1, 0, 7)).toBe(0);
    expect(ramp(-1, 0, 7)).toBe(0);
  });

  it('al cambiar de lado vuelve al centro con el tiempo de retorno', () => {
    const first = approachSteer(1, -1, rampConfig, DT);
    expect(first).toBeCloseTo(1 - DT / rampConfig.steerReturnTime, 12);
  });

  it('con tiempos 0 sigue a la entrada al instante', () => {
    const instant = { ...config, steerInTime: 0, steerReturnTime: 0 };
    expect(approachSteer(0, 1, instant, DT)).toBe(1);
    expect(approachSteer(1, -0.3, instant, DT)).toBe(-0.3);
  });
});
