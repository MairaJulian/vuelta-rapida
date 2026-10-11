import type { GhostSource } from '@/core/Ghost';
import type { Radians } from '@/core/MathUtils';

/** Modos de control que puede elegir el jugador. */
export type ControlMode = 'tilt' | 'buttons';

/**
 * Preferencias que se guardan entre partidas. Son del celular, no de cada jugador: las
 * comparten todos los perfiles. Los récords están en los perfiles (`core/Profiles`).
 * Serializable.
 */
export interface PlayerPreferences {
  /** Modo de control elegido; `null` hasta que el jugador elige. */
  controlMode: ControlMode | null;
  /** Ángulo que cuenta como derecho en la inclinación, en radianes; `null` sin calibrar. */
  tiltNeutralAngle: Radians | null;
  /** Sensibilidad de la inclinación, de 1 (suave) a 10 (rápida). */
  tiltSensitivity: number;
  /**
   * Zona muerta de la inclinación a cada lado del neutro, en radianes, de 1° a 9°.
   * Independiente de la sensibilidad.
   */
  tiltDeadZone: Radians;
  /** Si suenan el motor y los efectos. */
  soundEnabled: boolean;
  /** Qué fantasma corre al lado del jugador: su mejor vuelta, el récord de la pista o ninguno. */
  ghostSource: GhostSource;
  /** Si el celular vibra con los pianos, los bordes, la largada, la llegada y el freno. */
  vibrationEnabled: boolean;
}

/** Primer paso al abrir el juego, según lo que ya está guardado. */
export type StartStep = 'choose-control' | 'calibrate' | 'drive';
