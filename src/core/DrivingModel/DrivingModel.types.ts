import type { Radians } from '@/core/MathUtils';

/**
 * Estado físico del auto en el plano x/z (metros, y hacia arriba).
 * Vista cenital: x crece a la derecha y z hacia abajo de la pantalla.
 * Es serializable: solo números, sin clases ni referencias.
 */
export interface CarState {
  /** Posición en metros. */
  x: number;
  /** Posición en metros. */
  z: number;
  /** Rumbo en radianes, en (-π, π]. 0 mira hacia -z (arriba); positivo gira en sentido horario. */
  heading: Radians;
  /** Velocidad en el mundo, en m/s. Puede no coincidir con el rumbo: esa diferencia es el derrape. */
  vx: number;
  /** Velocidad en el mundo, en m/s. */
  vz: number;
  /** Dirección aplicada, de -1 (izquierda) a 1 (derecha). Sigue a la entrada con retardo. */
  steer: number;
}

/** Entrada abstracta del jugador. La aceleración es automática. */
export interface DrivingInput {
  /** -1 (izquierda) a 1 (derecha). */
  steer: number;
  /** 0 (suelto) a 1 (a fondo). */
  brake: number;
}

/** Parámetros ajustables del modelo arcade. */
export interface DrivingConfig {
  /** Tope de velocidad, en m/s. */
  maxSpeed: number;
  /** Empuje del acelerador automático, en m/s². */
  acceleration: number;
  /** Resistencia proporcional a la velocidad, en 1/s. */
  drag: number;
  /** Desaceleración con el freno a fondo, en m/s². */
  brakeDeceleration: number;
  /** Velocidad de giro con la dirección a fondo y autoridad completa, en rad/s. */
  maxTurnRate: number;
  /** Velocidad a partir de la cual el giro tiene autoridad completa, en m/s. */
  fullTurnSpeed: number;
  /** Fracción de giro que queda a velocidad máxima (subviraje), de 0 a 1. */
  highSpeedTurnFactor: number;
  /** Agarre lateral, en 1/s. Más bajo, más derrape. */
  lateralGrip: number;
  /** Rapidez con que la dirección aplicada sigue a la entrada, en unidades por segundo. */
  steerRate: number;
}
