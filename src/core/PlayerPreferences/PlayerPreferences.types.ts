import type { Radians } from '@/core/MathUtils';

/** Modos de control que puede elegir el jugador. */
export type ControlMode = 'tilt' | 'buttons';

/** Preferencias que se guardan entre partidas. Serializable. */
export interface PlayerPreferences {
  /** Modo de control elegido; `null` hasta que el jugador elige. */
  controlMode: ControlMode | null;
  /** Ángulo que cuenta como derecho en la inclinación, en radianes; `null` sin calibrar. */
  tiltNeutralAngle: Radians | null;
  /** Sensibilidad de la inclinación, de 1 (suave) a 10 (rápida). */
  tiltSensitivity: number;
}

/** Primer paso al abrir el juego, según lo que ya está guardado. */
export type StartStep = 'choose-control' | 'calibrate' | 'drive';
