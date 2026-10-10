import type { Radians } from '@/core/MathUtils';
import type { Scenery } from '@/core/Scenery';

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
  /** Parte recorrida del segmento, de 0 (en su primer punto) a 1 (en el siguiente). */
  t: number;
}

/**
 * Circuito listo para correr: el trazado más lo necesario para medir el progreso
 * y las vueltas. Serializable. Se arma con `createCircuit` (o `buildCircuit` desde
 * puntos de control).
 */
export interface Circuit extends TrackData {
  /** Identificador estable: es la clave del récord guardado. */
  id: string;
  /** Nombre para mostrar. */
  name: string;
  /** Distancia desde la meta hasta cada punto del trazado, en metros. `distances[0]` es 0. */
  distances: number[];
  /** Largo de la vuelta por el trazado central, en metros. */
  length: number;
  /** Puntos de control intermedios: distancia desde la meta, en orden, dentro de la vuelta. */
  checkpoints: number[];
  /** Tramos con pianos (uno por curva), en el orden de la vuelta. Se pueden pisar. */
  kerbs: KerbSection[];
  /**
   * Lo que rodea a la pista: árboles, carteles, tribuna, barreras y detalles del
   * asfalto (`core/Scenery`). Los circuitos del juego la traen; los de prueba, no.
   */
  scenery?: Scenery;
}

/**
 * Tramo con pianos a los dos lados de la pista, medido sobre el trazado central.
 * Puede cruzar la meta: termina en `(start + length) % length de la vuelta`.
 */
export interface KerbSection {
  /** Distancia desde la meta hasta el comienzo del piano, en metros. */
  start: number;
  /** Largo del piano, en metros. Igual al largo de la vuelta si toda la pista es curva. */
  length: number;
}

/** Datos para armar un circuito a partir de un trazado ya hecho. */
export interface CircuitSpec {
  id: string;
  name: string;
  centerline: TrackPoint[];
  width: number;
  /** Puntos de control intermedios como fracción de la vuelta, en orden, entre 0 y 1. */
  checkpointFractions: number[];
}

/** Ubicación del cartel "META": al costado de la pista, del lado de afuera del circuito. */
/** Silueta del trazado para dibujarla chica (tarjetas, minimapa), en un lienzo dado. */
export interface TrackOutline {
  /** Trazado cerrado como path SVG ("M x y L … Z"), en las coordenadas del lienzo. */
  path: string;
  /** Dónde queda la meta en el lienzo. */
  start: { x: number; y: number };
}

export interface FinishSign {
  /** Centro del cartel. */
  x: number;
  z: number;
  /** Giro del cartel, en radianes, para que el texto se lea derecho con la cámara fija. */
  rotation: Radians;
}
