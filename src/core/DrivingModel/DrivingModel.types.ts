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
  /** Dirección aplicada, de -1 (izquierda) a 1 (derecha). Sigue a la entrada con una rampa. */
  steer: number;
  /**
   * Segundos que lleva detenido con el freno apretado, hasta `reverseDelay`.
   * Al llegar empieza la marcha atrás; vuelve a 0 al soltar el freno.
   */
  reverseTimer: number;
}

/** Entrada abstracta del jugador. La aceleración es automática. */
export interface DrivingInput {
  /** -1 (izquierda) a 1 (derecha). */
  steer: number;
  /** 0 (suelto) a 1 (a fondo). Mantenido con el auto detenido, da marcha atrás. */
  brake: number;
}

/** Parámetros ajustables del modelo arcade. */
export interface DrivingConfig {
  /** Tope de velocidad, en m/s. */
  maxSpeed: number;
  /** Empuje del acelerador automático (y de la marcha atrás), en m/s². */
  acceleration: number;
  /** Resistencia proporcional a la velocidad, en 1/s. */
  drag: number;
  /** Desaceleración con el freno a fondo, en m/s². */
  brakeDeceleration: number;
  /** Distancia entre ejes, en metros. Con el ángulo de las ruedas define el radio de giro. */
  wheelbase: number;
  /** Ángulo máximo de las ruedas delanteras a baja velocidad, en radianes. */
  maxSteerAngle: Radians;
  /** Fracción del ángulo máximo que queda a velocidad máxima, de 0 a 1. */
  highSpeedSteerFactor: number;
  /**
   * Forma de la curva del ángulo según la velocidad (exponente). 1 es lineal;
   * menos de 1 recorta el giro ya a velocidades medias; más de 1, recién cerca del tope.
   */
  steerFalloff: number;
  /** Agarre lateral, en 1/s. Más bajo, más derrape. */
  lateralGrip: number;
  /** Segundos que tarda la dirección aplicada en ir del centro a fondo. */
  steerInTime: number;
  /** Segundos que tarda la dirección aplicada en volver de fondo al centro. */
  steerReturnTime: number;
  /** Pausa con el auto detenido y el freno apretado antes de la marcha atrás, en segundos. */
  reverseDelay: number;
  /** Tope de velocidad en marcha atrás, en m/s. */
  maxReverseSpeed: number;
  /** Roce mientras toca el borde de la pista, en 1/s: la velocidad cae con `exp(−wallFriction·dt)`. */
  wallFriction: number;
  /** Radio del auto para el límite de pista, en metros: medio ancho de la carrocería. */
  collisionRadius: number;
}
