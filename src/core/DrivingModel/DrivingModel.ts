import { clamp, wrapAngle } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';

import type { CarState, DrivingConfig, DrivingInput } from './DrivingModel.types';

/** Valores iniciales; se afinan con el panel de desarrollo. */
export const DEFAULT_DRIVING_CONFIG: DrivingConfig = {
  maxSpeed: 42,
  acceleration: 20,
  drag: 0.35,
  brakeDeceleration: 25,
  // Ejes del Monoplaza del handoff (y 20 y 64 en su viewBox) a escala de 2 × 4,5 m.
  wheelbase: 2.2,
  maxSteerAngle: 0.5,
  highSpeedSteerFactor: 0.12,
  steerFalloff: 0.5,
  lateralGrip: 8,
  steerInTime: 0.25,
  steerReturnTime: 0.15,
  reverseDelay: 0.4,
  maxReverseSpeed: 6,
};

/** Auto detenido en una posición y rumbo dados. */
export function createCarState(x: number, z: number, heading: Radians): CarState {
  'worklet';
  return { x, z, heading: wrapAngle(heading), vx: 0, vz: 0, steer: 0, reverseTimer: 0 };
}

/** Limita la entrada a sus rangos. Valores no finitos cuentan como 0. */
export function clampDrivingInput(input: DrivingInput): DrivingInput {
  'worklet';
  const steer = Number.isFinite(input.steer) ? clamp(input.steer, -1, 1) : 0;
  const brake = Number.isFinite(input.brake) ? clamp(input.brake, 0, 1) : 0;
  return { steer, brake };
}

/** Velocidad en la dirección del rumbo, en m/s. Negativa en marcha atrás. */
export function getForwardSpeed(car: CarState): number {
  'worklet';
  return car.vx * Math.sin(car.heading) - car.vz * Math.cos(car.heading);
}

/** Velocidad lateral (derrape), en m/s. Positiva: se desliza hacia la derecha del auto. */
export function getDriftSpeed(car: CarState): number {
  'worklet';
  return car.vx * Math.cos(car.heading) + car.vz * Math.sin(car.heading);
}

/** Módulo de la velocidad, en m/s. */
export function getSpeed(car: CarState): number {
  'worklet';
  return Math.hypot(car.vx, car.vz);
}

/**
 * Ángulo máximo de las ruedas para una velocidad, en radianes. Va de `maxSteerAngle`
 * detenido a `maxSteerAngle × highSpeedSteerFactor` a velocidad máxima, con la forma
 * que marca `steerFalloff`. Usa el módulo: en marcha atrás vale lo mismo.
 */
export function getMaxSteerAngle(speed: number, config: DrivingConfig): Radians {
  'worklet';
  const ratio = config.maxSpeed > 0 ? clamp(Math.abs(speed) / config.maxSpeed, 0, 1) : 1;
  const falloff = ratio > 0 ? Math.pow(ratio, Math.max(config.steerFalloff, 0)) : 0;
  const lowSpeedLoss = 1 - clamp(config.highSpeedSteerFactor, 0, 1);
  return config.maxSteerAngle * (1 - lowSpeedLoss * falloff);
}

/**
 * Velocidad de giro en rad/s (modelo de bicicleta): `velocidad × tan(ángulo) / ejes`.
 * Detenido no gira. En marcha atrás gira al revés, como un auto real: con la
 * dirección a la derecha, la cola va hacia la derecha.
 */
export function getTurnRate(forwardSpeed: number, steer: number, config: DrivingConfig): number {
  'worklet';
  if (config.wheelbase <= 0) {
    return 0;
  }
  const angle = steer * getMaxSteerAngle(forwardSpeed, config);
  return (forwardSpeed * Math.tan(angle)) / config.wheelbase;
}

/**
 * Acerca la dirección aplicada a la entrada con una rampa lineal. Alejarse del
 * centro tarda `steerInTime` de 0 a 1; volver al centro (o cambiar de lado) tarda
 * `steerReturnTime`. Con un tiempo de 0, sigue a la entrada al instante.
 */
export function approachSteer(
  current: number,
  target: number,
  config: DrivingConfig,
  dt: number,
): number {
  'worklet';
  const outward = target * current >= 0 && Math.abs(target) > Math.abs(current);
  const time = outward ? config.steerInTime : config.steerReturnTime;
  if (time <= 0) {
    return target;
  }
  const maxDelta = dt / time;
  return current + clamp(target - current, -maxDelta, maxDelta);
}

/**
 * Avanza el auto un paso de `dt` segundos. Función pura y determinista:
 * el mismo estado, entrada y configuración producen siempre el mismo resultado.
 */
export function stepCar(
  car: CarState,
  rawInput: DrivingInput,
  config: DrivingConfig,
  dt: number,
): CarState {
  'worklet';
  if (dt <= 0) {
    return car;
  }
  const input = clampDrivingInput(rawInput);

  // 1. La dirección aplicada sigue a la entrada con una rampa.
  const steer = approachSteer(car.steer, input.steer, config, dt);

  // 2. Giro de bicicleta: proporcional a la velocidad, con menos ángulo cuanto más rápido.
  const turnRate = getTurnRate(getForwardSpeed(car), steer, config);
  const heading = wrapAngle(car.heading + turnRate * dt);

  // 3. Velocidad descompuesta respecto del nuevo rumbo. Lo que quedó de lado es derrape.
  const forwardX = Math.sin(heading);
  const forwardZ = -Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = Math.sin(heading);
  let forward = car.vx * forwardX + car.vz * forwardZ;
  let lateral = car.vx * rightX + car.vz * rightZ;

  // 4. Acelerador automático; el mismo botón frena y, tras una pausa detenido, da marcha atrás.
  let reverseTimer = 0;
  if (input.brake <= 0) {
    // Suelto: acelera. Si venía en marcha atrás, el mismo empuje primero la frena.
    forward += (config.acceleration - config.drag * forward) * dt;
  } else if (forward > 0) {
    // Frenando hacia delante: no pasa de 0 en este paso.
    const deceleration = config.brakeDeceleration * input.brake + config.drag * forward;
    forward = Math.max(0, forward - deceleration * dt);
  } else {
    // Detenido o ya en reversa con el freno apretado.
    reverseTimer = Math.min(car.reverseTimer + dt, config.reverseDelay);
    if (forward < 0 || reverseTimer >= config.reverseDelay) {
      forward -= (config.acceleration * input.brake + config.drag * forward) * dt;
    }
  }
  forward = clamp(forward, -config.maxReverseSpeed, config.maxSpeed);

  // 5. El agarre lateral corrige el derrape de forma exponencial (estable con cualquier dt).
  lateral *= Math.exp(-config.lateralGrip * dt);

  // 6. Recompone la velocidad, respeta el tope total e integra la posición.
  let vx = forwardX * forward + rightX * lateral;
  let vz = forwardZ * forward + rightZ * lateral;
  const speed = Math.hypot(vx, vz);
  if (speed > config.maxSpeed) {
    const scale = config.maxSpeed / speed;
    vx *= scale;
    vz *= scale;
  }

  return { x: car.x + vx * dt, z: car.z + vz * dt, heading, vx, vz, steer, reverseTimer };
}
