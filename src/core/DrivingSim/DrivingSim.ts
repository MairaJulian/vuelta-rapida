import { stepCar } from '@/core/DrivingModel';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import { consumeFrameTime, getStepAlpha } from '@/core/FixedStep';
import type { FixedStepConfig } from '@/core/FixedStep';
import { lerp, lerpAngle } from '@/core/MathUtils';
import type { TrackData } from '@/core/Track';
import { constrainToTrack } from '@/core/TrackBounds';

import type { DrivingSimState } from './DrivingSim.types';

/** Simulación nueva con el auto en su posición inicial. */
export function createDrivingSim(car: CarState): DrivingSimState {
  'worklet';
  return { car, previousCar: car, tick: 0, accumulatorMs: 0 };
}

/**
 * Avanza la simulación con el tiempo de un cuadro. Ejecuta tantos pasos fijos
 * como correspondan; la entrada se mantiene durante todos los pasos del cuadro.
 * Después de cada paso, el auto se mantiene dentro de la pista.
 */
export function advanceDrivingSim(
  sim: DrivingSimState,
  frameMs: number,
  input: DrivingInput,
  drivingConfig: DrivingConfig,
  track: TrackData,
  stepConfig: FixedStepConfig,
): DrivingSimState {
  'worklet';
  const { steps, accumulatorMs } = consumeFrameTime(sim.accumulatorMs, frameMs, stepConfig);
  const dt = 1 / stepConfig.stepHz;
  let car = sim.car;
  let previousCar = sim.previousCar;
  for (let i = 0; i < steps; i += 1) {
    previousCar = car;
    car = constrainToTrack(stepCar(car, input, drivingConfig, dt), track, drivingConfig, dt);
  }
  return { car, previousCar, tick: sim.tick + steps, accumulatorMs };
}

/** Mezcla dos estados del auto. `alpha` = 0 devuelve `previous`; 1 devuelve `current`. */
export function interpolateCar(previous: CarState, current: CarState, alpha: number): CarState {
  'worklet';
  return {
    x: lerp(previous.x, current.x, alpha),
    z: lerp(previous.z, current.z, alpha),
    heading: lerpAngle(previous.heading, current.heading, alpha),
    vx: lerp(previous.vx, current.vx, alpha),
    vz: lerp(previous.vz, current.vz, alpha),
    steer: lerp(previous.steer, current.steer, alpha),
    reverseTimer: lerp(previous.reverseTimer, current.reverseTimer, alpha),
  };
}

/**
 * Estado a dibujar en este cuadro: interpola entre los dos últimos pasos según
 * el tiempo acumulado. Evita tirones cuando la pantalla va a 90 o 120 Hz y la
 * física a 60 Hz. No modifica la simulación.
 */
export function getRenderCar(sim: DrivingSimState, stepConfig: FixedStepConfig): CarState {
  'worklet';
  return interpolateCar(sim.previousCar, sim.car, getStepAlpha(sim.accumulatorMs, stepConfig));
}
