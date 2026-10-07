import { stepCar } from '@/core/DrivingModel';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import { consumeFrameTime, getStepAlpha } from '@/core/FixedStep';
import type { FixedStepConfig } from '@/core/FixedStep';
import { createLapState, stepLapTimer } from '@/core/LapTimer';
import { lerp, lerpAngle } from '@/core/MathUtils';
import { getNearestOnCenterline, getProgressAt } from '@/core/Track';
import type { Circuit } from '@/core/Track';
import { constrainToHit } from '@/core/TrackBounds';

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
  };
}

/**
 * Avanza la simulación con el tiempo de un cuadro. Ejecuta tantos pasos fijos
 * como correspondan; la entrada se mantiene durante todos los pasos del cuadro.
 * En cada paso: mueve el auto, busca una vez el punto más cercano del trazado
 * (cerca del segmento del paso anterior), mantiene el auto dentro de la pista y
 * actualiza las vueltas con el progreso de ese mismo punto.
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
  if (steps === 0) {
    return { ...sim, accumulatorMs };
  }
  const dt = 1 / stepConfig.stepHz;
  let car = sim.car;
  let previousCar = sim.previousCar;
  let trackSegment = sim.trackSegment;
  let laps = sim.laps;
  let tick = sim.tick;
  for (let i = 0; i < steps; i += 1) {
    previousCar = car;
    const moved = stepCar(car, input, drivingConfig, dt);
    const hit = getNearestOnCenterline(circuit, moved.x, moved.z, trackSegment);
    car = constrainToHit(moved, hit, circuit, drivingConfig, dt);
    trackSegment = hit.segment;
    tick += 1;
    laps = stepLapTimer(laps, getProgressAt(circuit, hit), circuit, tick);
  }
  return { car, previousCar, tick, accumulatorMs, trackSegment, laps };
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
