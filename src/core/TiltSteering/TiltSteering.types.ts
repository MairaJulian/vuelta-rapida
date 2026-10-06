import type { Radians } from '@/core/MathUtils';

/**
 * Rotación de la pantalla respecto de la posición natural del celular, en grados,
 * como la informa Android (`Display.getRotation`). En horizontal es 90 o 270.
 */
export type ScreenRotation = 0 | 90 | 180 | 270;

/**
 * Lectura del sensor: el vector gravedad en coordenadas del celular (x a la derecha
 * y y hacia arriba en vertical, z saliendo de la pantalla), apuntando hacia el suelo.
 * La unidad no importa: solo se usa la dirección. `rotation` es la de la pantalla
 * al tomar la lectura, sin ninguna corrección aplicada al vector.
 */
export interface GravityReading {
  x: number;
  y: number;
  z: number;
  rotation: ScreenRotation;
}

/** Inclinación del celular vista desde la pantalla. */
export interface ScreenTilt {
  /**
   * Giro del celular alrededor del eje perpendicular a la pantalla, como un volante,
   * en radianes. 0 = derecho; positivo = girado en sentido horario (a la derecha).
   */
  angle: Radians;
  /**
   * Parte de la gravedad que cae sobre el plano de la pantalla, de 0 (celular plano,
   * el ángulo no es confiable) a 1 (pantalla vertical).
   */
  planar: number;
}

/** Parámetros del control por inclinación. */
export interface TiltConfig {
  /** Ángulo que cuenta como derecho, capturado al calibrar, en radianes. */
  neutralAngle: Radians;
  /** Zona muerta a cada lado del ángulo neutro, en radianes: dentro, el auto va derecho. */
  deadZone: Radians;
  /** Sensibilidad de 1 (suave) a 10 (rápida). Define el ángulo que equivale a giro completo. */
  sensitivity: number;
  /** Constante de tiempo del filtro contra el temblor, en segundos. 0 = sin filtro. */
  smoothing: number;
  /** Rampa de la dirección del modelo de manejo en modo inclinación, en segundos. */
  steerRampTime: number;
}

/** Lo que el filtro recuerda entre lecturas. Serializable. */
export interface TiltState {
  /** Ángulo filtrado de la pantalla, sin calibrar, en radianes. */
  angle: Radians;
  /** Rotación de la pantalla con la que se filtró; si cambia, el filtro se reinicia. */
  rotation: ScreenRotation;
  /** false hasta la primera lectura confiable. */
  hasReading: boolean;
}

/** Resultado de procesar una lectura. */
export interface TiltSteeringResult {
  state: TiltState;
  /** Dirección para la simulación, de -1 a 1. */
  steer: number;
  /** Ángulo respecto del neutro (ya calibrado y filtrado), en radianes. Para mostrar. */
  relativeAngle: Radians;
  /** Confianza de la lectura: 0 con el celular plano, 1 con la pantalla bien inclinada. */
  confidence: number;
}
