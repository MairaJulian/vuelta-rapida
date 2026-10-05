import { clamp, wrapAngle } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';

import type { CarState, DrivingConfig, DrivingInput } from './DrivingModel.types';

/** Valores iniciales; se afinan con el panel de desarrollo. */
export const DEFAULT_DRIVING_CONFIG: DrivingConfig = {
  maxSpeed: 50,
  acceleration: 20,
  drag: 0.35,
  brakeDeceleration: 25,
  maxTurnRate: 2.2,
  fullTurnSpeed: 8,
  highSpeedTurnFactor: 0.55,
  lateralGrip: 8,
  steerRate: 8,
};

/** Auto detenido en una posición y rumbo dados. */
export function createCarState(x: number, z: number, heading: Radians): CarState {
  'worklet';
  return { x, z, heading: wrapAngle(heading), vx: 0, vz: 0, steer: 0 };
}

/** Limita la entrada a sus rangos. Valores no finitos cuentan como 0. */
export function clampDrivingInput(input: DrivingInput): DrivingInput {
  'worklet';
  const steer = Number.isFinite(input.steer) ? clamp(input.steer, -1, 1) : 0;
  const brake = Number.isFinite(input.brake) ? clamp(input.brake, 0, 1) : 0;
  return { steer, brake };
}

/** Velocidad en la dirección del rumbo, en m/s. */
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
 * Cuánto puede girar el auto según su velocidad, de 0 a 1.
 * Detenido no gira; la autoridad crece hasta `fullTurnSpeed` y luego cae
 * hasta `highSpeedTurnFactor` a velocidad máxima.
 */
export function getTurnAuthority(speed: number, config: DrivingConfig): number {
  'worklet';
  if (speed <= 0) {
    return 0;
  }
  if (speed < config.fullTurnSpeed) {
    return speed / config.fullTurnSpeed;
  }
  const highSpeedRange = config.maxSpeed - config.fullTurnSpeed;
  if (highSpeedRange <= 0) {
    return 1;
  }
  const t = clamp((speed - config.fullTurnSpeed) / highSpeedRange, 0, 1);
  return 1 + (config.highSpeedTurnFactor - 1) * t;
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

  // 1. La dirección aplicada sigue a la entrada a un ritmo limitado.
  const maxSteerDelta = config.steerRate * dt;
  const steer = car.steer + clamp(input.steer - car.steer, -maxSteerDelta, maxSteerDelta);

  // 2. Giro proporcional a la velocidad: detenido no gira.
  const authority = getTurnAuthority(getForwardSpeed(car), config);
  const heading = wrapAngle(car.heading + steer * config.maxTurnRate * authority * dt);

  // 3. Velocidad descompuesta respecto del nuevo rumbo. Lo que quedó de lado es derrape.
  const forwardX = Math.sin(heading);
  const forwardZ = -Math.cos(heading);
  const rightX = Math.cos(heading);
  const rightZ = Math.sin(heading);
  let forward = car.vx * forwardX + car.vz * forwardZ;
  let lateral = car.vx * rightX + car.vz * rightZ;

  // 4. Acelerador automático salvo al frenar; resistencia; sin marcha atrás.
  const throttle = input.brake > 0 ? 0 : 1;
  forward +=
    (config.acceleration * throttle -
      config.drag * forward -
      config.brakeDeceleration * input.brake) *
    dt;
  forward = clamp(forward, 0, config.maxSpeed);

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

  return { x: car.x + vx * dt, z: car.z + vz * dt, heading, vx, vz, steer };
}
