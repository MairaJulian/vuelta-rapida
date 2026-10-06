import type { Radians } from '@/core/MathUtils';

/** Punto del plano, en metros. */
export interface TrackPoint {
  x: number;
  z: number;
}

/**
 * Circuito como datos: un trazado central cerrado y un ancho. Serializable.
 * El punto 0 es la meta y la carrera avanza en el orden de los índices; el
 * último punto se une con el primero.
 */
export interface TrackData {
  /** Puntos del trazado central, en metros. Las curvas se describen con muchos puntos. */
  centerline: TrackPoint[];
  /** Ancho del asfalto, en metros. */
  width: number;
}

/** Medidas de un óvalo tipo estadio: dos rectas horizontales unidas por dos semicírculos. */
export interface OvalSpec {
  /** Largo de cada recta, en metros. */
  straightLength: number;
  /** Radio de las curvas, medido en el trazado central. */
  radius: number;
  /** Ancho del asfalto. */
  width: number;
  /** Segmentos con que se aproxima cada semicírculo. */
  segmentsPerCurve: number;
}

/** Posición y rumbo en el plano. */
export interface Pose {
  x: number;
  z: number;
  heading: Radians;
}

/** Línea de meta: atraviesa la pista en el punto 0 del trazado. */
export interface FinishLine {
  /** Centro de la línea. */
  x: number;
  z: number;
  /** Rumbo de la carrera al cruzarla; la línea es perpendicular a él. */
  heading: Radians;
  /** Largo a lo ancho de la pista. */
  length: number;
  /** Grosor en el sentido de la marcha. */
  thickness: number;
}

/** Punto del trazado central más cercano a una posición. */
export interface CenterlineHit {
  x: number;
  z: number;
  /** Distancia de la posición al trazado, en metros. */
  distance: number;
  /** Índice del segmento (de `centerline[segment]` al punto siguiente). */
  segment: number;
}
