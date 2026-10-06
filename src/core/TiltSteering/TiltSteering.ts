import type { DrivingConfig } from '@/core/DrivingModel';
import { clamp, wrapAngle } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';

import type {
  GravityReading,
  ScreenTilt,
  TiltConfig,
  TiltState,
  TiltSteeringResult,
} from './TiltSteering.types';

const DEGREE = Math.PI / 180;

/** Ángulo de giro completo con la sensibilidad mínima (1) y máxima (10). */
const SOFTEST_FULL_TURN = 45 * DEGREE;
const SHARPEST_FULL_TURN = 12 * DEGREE;

/**
 * Por debajo de esta parte de la gravedad sobre la pantalla (unos 15° de la
 * horizontal) el celular cuenta como plano y no se dobla. Hasta `FLAT_FULL` la
 * dirección se atenúa de forma gradual, para que no haya saltos.
 */
const FLAT_MIN = 0.25;
const FLAT_FULL = 0.4;

/** Valores iniciales; la calibración y la sensibilidad las elige el jugador. */
export const DEFAULT_TILT_CONFIG: TiltConfig = {
  neutralAngle: 0,
  deadZone: 5 * DEGREE,
  sensitivity: 5,
  smoothing: 0.06,
  steerRampTime: 0.08,
};

/** Filtro vacío, a la espera de la primera lectura. */
export function createTiltState(): TiltState {
  'worklet';
  return { angle: 0, rotation: 0, hasReading: false };
}

/**
 * Pasa el vector del sensor a coordenadas de pantalla (x a la derecha, y hacia
 * arriba de lo que se ve). Es la única corrección por orientación del proyecto:
 * el sensor debe entregar el vector sin ajustar. Así, la misma inclinación da el
 * mismo ángulo en las dos orientaciones horizontales.
 */
export function toScreenGravity(reading: GravityReading): { x: number; y: number; z: number } {
  'worklet';
  const { x, y, z } = reading;
  switch (reading.rotation) {
    case 90:
      return { x: -y, y: x, z };
    case 180:
      return { x: -x, y: -y, z };
    case 270:
      return { x: y, y: -x, z };
    default:
      return { x, y, z };
  }
}

/** Ángulo de volante del celular y cuánto de la gravedad cae sobre la pantalla. */
export function getScreenTilt(reading: GravityReading): ScreenTilt {
  'worklet';
  const screen = toScreenGravity(reading);
  const total = Math.hypot(screen.x, screen.y, screen.z);
  const planar = Math.hypot(screen.x, screen.y);
  return {
    // Derecho, la gravedad apunta hacia abajo de la pantalla (y negativa).
    angle: Math.atan2(screen.x, -screen.y),
    planar: total > 0 ? planar / total : 0,
  };
}

/**
 * Ángulo que equivale a giro completo según la sensibilidad: 1 → 45°, 10 → 12°,
 * en escala geométrica (cada punto achica el ángulo en la misma proporción). 5 → 25°.
 */
export function getFullTurnAngle(sensitivity: number): Radians {
  'worklet';
  const t = clamp((sensitivity - 1) / 9, 0, 1);
  return SOFTEST_FULL_TURN * Math.pow(SHARPEST_FULL_TURN / SOFTEST_FULL_TURN, t);
}

/**
 * Convierte un ángulo calibrado en dirección de -1 a 1. Dentro de la zona muerta
 * da 0; fuera, crece en línea recta desde el borde de la zona hasta el giro
 * completo, así no hay un salto al salir de ella.
 */
export function angleToSteer(angle: Radians, deadZone: Radians, fullTurnAngle: Radians): number {
  'worklet';
  const magnitude = Math.abs(angle);
  if (magnitude <= deadZone) {
    return 0;
  }
  const span = fullTurnAngle - deadZone;
  const amount = span > 0 ? (magnitude - deadZone) / span : 1;
  return Math.sign(angle) * Math.min(amount, 1);
}

/** Confianza de la lectura según la parte de la gravedad sobre la pantalla (0 plano, 1 confiable). */
export function getTiltConfidence(planar: number): number {
  'worklet';
  const t = clamp((planar - FLAT_MIN) / (FLAT_FULL - FLAT_MIN), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Procesa una lectura del sensor: corrige la orientación, filtra el temblor,
 * resta la calibración y aplica zona muerta y sensibilidad. Pura y determinista.
 *
 * - Con el celular casi plano, el filtro se congela y la dirección cae a 0.
 * - Si cambia la orientación horizontal, el filtro se reinicia con el ángulo nuevo
 *   en lugar de recorrer la diferencia, para no dar un volantazo.
 */
export function stepTiltSteering(
  state: TiltState,
  reading: GravityReading,
  config: TiltConfig,
  dt: number,
): TiltSteeringResult {
  'worklet';
  const tilt = getScreenTilt(reading);
  const confidence = getTiltConfidence(tilt.planar);

  let next = state;
  if (confidence > 0) {
    if (!state.hasReading || state.rotation !== reading.rotation) {
      next = { angle: tilt.angle, rotation: reading.rotation, hasReading: true };
    } else {
      const blend = config.smoothing > 0 ? 1 - Math.exp(-Math.max(dt, 0) / config.smoothing) : 1;
      next = {
        angle: wrapAngle(state.angle + wrapAngle(tilt.angle - state.angle) * blend),
        rotation: state.rotation,
        hasReading: true,
      };
    }
  }

  const relativeAngle = wrapAngle(next.angle - config.neutralAngle);
  const steer = next.hasReading
    ? angleToSteer(relativeAngle, config.deadZone, getFullTurnAngle(config.sensitivity)) *
        confidence || 0
    : 0;
  return { state: next, steer, relativeAngle, confidence };
}

/**
 * Calibración: toma el ángulo filtrado actual como el nuevo "derecho". Sin
 * lecturas todavía, deja la configuración como estaba.
 */
export function calibrateTilt(state: TiltState, config: TiltConfig): TiltConfig {
  'worklet';
  return state.hasReading ? { ...config, neutralAngle: state.angle } : config;
}

/**
 * Configuración del manejo para el modo inclinación: la señal ya es continua y
 * filtrada, así que la rampa de la dirección se acorta a `steerRampTime` y queda
 * solo como tope ante saltos. El modelo de manejo no sabe qué control se usa.
 */
export function withTiltSteering(
  drivingConfig: DrivingConfig,
  tiltConfig: TiltConfig,
): DrivingConfig {
  return {
    ...drivingConfig,
    steerInTime: tiltConfig.steerRampTime,
    steerReturnTime: tiltConfig.steerRampTime,
  };
}
