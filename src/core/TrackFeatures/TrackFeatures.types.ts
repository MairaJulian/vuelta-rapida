import type { Radians } from '@/core/MathUtils';

/** Lado de la pista respecto del sentido de la marcha: 1 a la derecha, -1 a la izquierda. */
export type TrackSide = 1 | -1;

/** Punto del trazado central a cierta distancia de la meta, con el rumbo de su tramo. */
export interface TrackSample {
  x: number;
  z: number;
  /** Rumbo del tramo (0 hacia -z, positivo en sentido horario). */
  heading: Radians;
  /** Distancia desde la meta, en metros, de 0 al largo de la vuelta (sin incluirlo). */
  distance: number;
}

/**
 * Curva cerrada: un tramo en el que el radio baja del umbral y obliga a frenar. Se
 * mide sobre el trazado central; puede cruzar la meta.
 */
export interface TightCorner {
  /** Distancia desde la meta hasta la entrada, en metros. */
  start: number;
  /** Largo del tramo cerrado, en metros. */
  length: number;
  /** Hacia dónde gira al entrar: 1 a la derecha (horario), -1 a la izquierda. */
  direction: TrackSide;
  /** Radio más cerrado del tramo, en metros. */
  minRadius: number;
}

/** Recta: tramo sin pianos entre dos curvas, medido sobre el trazado central. */
export interface TrackStraight {
  /** Distancia desde la meta hasta el comienzo, en metros. */
  start: number;
  /** Largo, en metros. */
  length: number;
  /** Rumbo de la cuerda, del comienzo al final. */
  heading: Radians;
}

/** Escapatorias: pasto libre entre la pista y la escenografía, en metros. */
export interface RunoffConfig {
  /** En las rectas y del lado de adentro de las curvas, desde el borde blanco o el piano. */
  straightRunoff: number;
  /** Del lado de afuera de las curvas (con pianos), desde el borde del piano. */
  curveRunoff: number;
}

/**
 * Zona libre alrededor de la pista: para cada punto del trazado, cuánto espacio sin
 * objetos hay hacia cada lado desde el trazado central (pista + escapatoria). Trae una
 * grilla de los tramos para revisar un punto sin recorrer toda la vuelta. Serializable.
 */
export interface TrackClearance {
  /** Distancia libre hacia la izquierda de cada punto del trazado, en metros. */
  left: number[];
  /** Distancia libre hacia la derecha de cada punto del trazado, en metros. */
  right: number[];
  /** La mayor distancia libre de toda la vuelta: más lejos que esto no hay que revisar. */
  maxClearance: number;
  /** Lado de cada celda de la grilla, en metros. */
  cellSize: number;
  /** Tramos (índice de su primer punto) que tocan cada celda, por clave "columna,fila". */
  cells: Record<string, number[]>;
}
