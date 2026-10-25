import type { GhostSource } from '@/core/Ghost';
import type { Radians } from '@/core/MathUtils';
import type { AiLevelId } from '@/core/RivalAI';

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
  /** Rivales con IA en la carrera, de 0 (sin rivales, contrarreloj) a `MAX_RIVALS`. */
  rivalCount: number;
  /** Dificultad de los rivales. */
  aiLevel: AiLevelId;
  /** Si los rivales aprietan cuando el jugador va muy adelante y aflojan cuando va muy atrás. */
  dynamicDifficulty: boolean;
  /** Si los autos chocan entre sí. Apagado, se atraviesan. */
  collisionsEnabled: boolean;
  /** Vueltas de la carrera, de `MIN_RACE_LAPS` a `MAX_RACE_LAPS` (10). */
  lapCount: number;
}

/** Primer paso al abrir el juego, según lo que ya está guardado. */
export type StartStep = 'choose-control' | 'calibrate' | 'drive';
