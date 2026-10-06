import { clamp } from '@/core/MathUtils';
import type { TiltConfig } from '@/core/TiltSteering';

import type { ControlMode, PlayerPreferences, StartStep } from './PlayerPreferences.types';

export const CONTROL_MODES: readonly ControlMode[] = ['tilt', 'buttons'];

/** Sin elegir ni calibrar, con la sensibilidad del medio. */
export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = Object.freeze({
  controlMode: null,
  tiltNeutralAngle: null,
  tiltSensitivity: 5,
});

const MIN_SENSITIVITY = 1;
const MAX_SENSITIVITY = 10;

function isControlMode(value: unknown): value is ControlMode {
  return CONTROL_MODES.includes(value as ControlMode);
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Lee las preferencias guardadas. Tolera texto vacío, JSON roto y campos de más o
 * con valores inválidos: cada campo que no sirve vuelve a su valor por defecto,
 * así una versión vieja o un dato corrupto nunca dejan el juego sin arrancar.
 */
export function parsePlayerPreferences(raw: string | null): PlayerPreferences {
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (typeof data !== 'object' || data === null) {
    return { ...DEFAULT_PLAYER_PREFERENCES };
  }
  const fields = data as Record<string, unknown>;
  return {
    controlMode: isControlMode(fields.controlMode) ? fields.controlMode : null,
    tiltNeutralAngle: isFiniteNumber(fields.tiltNeutralAngle) ? fields.tiltNeutralAngle : null,
    tiltSensitivity: isFiniteNumber(fields.tiltSensitivity)
      ? clamp(fields.tiltSensitivity, MIN_SENSITIVITY, MAX_SENSITIVITY)
      : DEFAULT_PLAYER_PREFERENCES.tiltSensitivity,
  };
}

/** Texto para guardar. Solo los campos conocidos, en un orden fijo. */
export function serializePlayerPreferences(preferences: PlayerPreferences): string {
  return JSON.stringify({
    controlMode: preferences.controlMode,
    tiltNeutralAngle: preferences.tiltNeutralAngle,
    tiltSensitivity: preferences.tiltSensitivity,
  });
}

/**
 * Por dónde empieza el juego: primero elegir el control; con inclinación sin
 * calibrar, la calibración; si no, directo a la pista.
 */
export function getStartStep(preferences: PlayerPreferences): StartStep {
  if (preferences.controlMode === null) {
    return 'choose-control';
  }
  if (preferences.controlMode === 'tilt' && preferences.tiltNeutralAngle === null) {
    return 'calibrate';
  }
  return 'drive';
}

/** Lleva la calibración y la sensibilidad guardadas a la configuración de la inclinación. */
export function withTiltPreferences(
  config: TiltConfig,
  preferences: PlayerPreferences,
): TiltConfig {
  return {
    ...config,
    neutralAngle: preferences.tiltNeutralAngle ?? 0,
    sensitivity: preferences.tiltSensitivity,
  };
}
