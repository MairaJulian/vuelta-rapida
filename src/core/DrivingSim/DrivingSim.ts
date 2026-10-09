import { stepCar } from '@/core/DrivingModel';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import { consumeFrameTime, getStepAlpha } from '@/core/FixedStep';
import type { FixedStepConfig } from '@/core/FixedStep';
import { createLapState, stepLapTimer } from '@/core/LapTimer';
import { lerp, lerpAngle } from '@/core/MathUtils';
import { getKerbFactor, getNearestOnCenterline, getProgressAt } from '@/core/Track';
import type { Circuit } from '@/core/Track';
import { NO_CONTACT, resolveTrackContact } from '@/core/TrackBounds';

import type { DrivingSimState } from './DrivingSim.types';

/** Simulación nueva con el auto en su posición inicial y las vueltas sin empezar. */
export function createDrivingSim(car: CarState): DrivingSimState {
  'worklet';
  return {
    car,
    previousCar: car,
    tick: 0,
    accumulatorMs: 0,
    trackSegment: -1,
    laps: createLapState(),
    contact: NO_CONTACT,
  };
}

/**
 * Un paso fijo de `dt` segundos: mueve el auto, busca una vez el punto más
 * cercano del trazado (cerca del segmento del paso anterior), mantiene el auto
 * dentro de la pista (sobre los pianos, hasta su borde exterior) y actualiza las
 * vueltas con el progreso de ese mismo punto. No toca el tiempo acumulado.
 */
export function stepDrivingSim(
  sim: DrivingSimState,
  input: DrivingInput,
  drivingConfig: DrivingConfig,
  circuit: Circuit,
  dt: number,
): DrivingSimState {
  'worklet';
  const moved = stepCar(sim.car, input, drivingConfig, dt);
  const hit = getNearestOnCenterline(circuit, moved.x, moved.z, sim.trackSegment);
  const progress = getProgressAt(circuit, hit);
  const kerbFactor = getKerbFactor(circuit.kerbs, circuit.length, progress);
  const { car, contact } = resolveTrackContact(moved, hit, circuit, drivingConfig, dt, kerbFactor);
  const tick = sim.tick + 1;
  return {
    car,
    previousCar: sim.car,
    tick,
    accumulatorMs: sim.accumulatorMs,
    trackSegment: hit.segment,
    laps: stepLapTimer(sim.laps, progress, circuit, tick),
    contact,
  };
}

/**
 * Avanza la simulación con el tiempo de un cuadro. Ejecuta tantos pasos fijos
 * (`stepDrivingSim`) como correspondan; la entrada se mantiene durante todos los
 * pasos del cuadro.
 */
export function advanceDrivingSim(
  sim: DrivingSimState,
  frameMs: number,
  input: DrivingInput,
  drivingConfig: DrivingConfig,
  circuit: Circuit,
  stepConfig: FixedStepConfig,
): DrivingSimState {
  'worklet';
  const { steps, accumulatorMs } = consumeFrameTime(sim.accumulatorMs, frameMs, stepConfig);
  const dt = 1 / stepConfig.stepHz;
  let next = sim;
  for (let i = 0; i < steps; i += 1) {
    next = stepDrivingSim(next, input, drivingConfig, circuit, dt);
  }
  return { ...next, accumulatorMs };
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
