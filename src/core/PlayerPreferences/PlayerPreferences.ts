import { clamp } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';
import { serializeSaveDocument } from '@/core/SaveData';
import { DEFAULT_TILT_CONFIG, MAX_DEAD_ZONE, MIN_DEAD_ZONE } from '@/core/TiltSteering';
import type { TiltConfig } from '@/core/TiltSteering';

import type { ControlMode, PlayerPreferences, StartStep } from './PlayerPreferences.types';

export const CONTROL_MODES: readonly ControlMode[] = ['tilt', 'buttons'];

/**
 * Sin elegir ni calibrar, con la sensibilidad del medio, la zona muerta inicial (5°) y
 * con sonido y vibración.
 */
export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = Object.freeze({
  controlMode: null,
  tiltNeutralAngle: null,
  tiltSensitivity: 5,
  tiltDeadZone: DEFAULT_TILT_CONFIG.deadZone,
  soundEnabled: true,
  vibrationEnabled: true,
});

const MIN_SENSITIVITY = 1;
const MAX_SENSITIVITY = 10;

/**
 * Niveles de la zona muerta para el jugador: de 1 (chica, `MIN_DEAD_ZONE`, 1°) a 5
 * (grande, `MAX_DEAD_ZONE`, 9°), parejos de a 2°. El nivel 3 son los 5° iniciales.
 */
export const DEAD_ZONE_LEVELS = 5;

/** Zona muerta, en radianes, de un nivel de la escala del jugador. */
export function deadZoneFromLevel(level: number): Radians {
  const t = clamp((level - 1) / (DEAD_ZONE_LEVELS - 1), 0, 1);
  return MIN_DEAD_ZONE + t * (MAX_DEAD_ZONE - MIN_DEAD_ZONE);
}

/** Nivel de la escala del jugador para una zona muerta en radianes (puede no ser entero). */
export function deadZoneToLevel(deadZone: Radians): number {
  const t = clamp((deadZone - MIN_DEAD_ZONE) / (MAX_DEAD_ZONE - MIN_DEAD_ZONE), 0, 1);
  return 1 + t * (DEAD_ZONE_LEVELS - 1);
}

function isControlMode(value: unknown): value is ControlMode {
  return CONTROL_MODES.includes(value as ControlMode);
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Lee las preferencias guardadas (ya migradas, ver `core/SaveData`). Tolera texto
 * vacío, JSON roto y campos de más o con valores inválidos: cada campo que no sirve
 * vuelve a su valor por defecto, así un dato corrupto nunca deja el juego sin arrancar.
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
    tiltDeadZone: isFiniteNumber(fields.tiltDeadZone)
      ? clamp(fields.tiltDeadZone, MIN_DEAD_ZONE, MAX_DEAD_ZONE)
      : DEFAULT_PLAYER_PREFERENCES.tiltDeadZone,
    soundEnabled:
      typeof fields.soundEnabled === 'boolean'
        ? fields.soundEnabled
        : DEFAULT_PLAYER_PREFERENCES.soundEnabled,
    vibrationEnabled:
      typeof fields.vibrationEnabled === 'boolean'
        ? fields.vibrationEnabled
        : DEFAULT_PLAYER_PREFERENCES.vibrationEnabled,
  };
}

/**
 * Texto para guardar: el número de versión de los datos guardados (`core/SaveData`) y
 * solo los campos conocidos, en un orden fijo.
 */
export function serializePlayerPreferences(preferences: PlayerPreferences): string {
  return serializeSaveDocument({
    controlMode: preferences.controlMode,
    tiltNeutralAngle: preferences.tiltNeutralAngle,
    tiltSensitivity: preferences.tiltSensitivity,
    tiltDeadZone: preferences.tiltDeadZone,
    soundEnabled: preferences.soundEnabled,
    vibrationEnabled: preferences.vibrationEnabled,
  });
}

/**
 * Si un modo guardado se puede usar al abrir el juego. Con la inclinación
 * desactivada (`FEATURE_FLAGS.tiltControl`), una inclinación guardada, de una prueba
 * anterior o del panel de desarrollo, no vale: el juego arranca con botones.
 */
export function isControlModeAvailable(mode: ControlMode | null, tiltEnabled: boolean): boolean {
  return tiltEnabled || mode !== 'tilt';
}

/**
 * Por dónde empieza el juego: primero elegir el control; con inclinación sin
 * calibrar, la calibración; si no, directo a la pista. Con la inclinación
 * desactivada no hay nada que elegir ni calibrar: siempre a la pista.
 */
export function getStartStep(preferences: PlayerPreferences, tiltEnabled = true): StartStep {
  if (!tiltEnabled) {
    return 'drive';
  }
  if (preferences.controlMode === null) {
    return 'choose-control';
  }
  if (preferences.controlMode === 'tilt' && preferences.tiltNeutralAngle === null) {
    return 'calibrate';
  }
  return 'drive';
}

/**
 * Lleva la calibración, la sensibilidad y la zona muerta guardadas a la
 * configuración de la inclinación. Cada preferencia va a su propio campo.
 */
export function withTiltPreferences(
  config: TiltConfig,
  preferences: PlayerPreferences,
): TiltConfig {
  return {
    ...config,
    neutralAngle: preferences.tiltNeutralAngle ?? 0,
    sensitivity: preferences.tiltSensitivity,
    deadZone: preferences.tiltDeadZone,
  };
}
