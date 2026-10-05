import type { Radians } from '@/core/MathUtils';

/**
 * Óvalo tipo estadio: dos rectas horizontales unidas por dos semicírculos.
 * Medidas en metros, sobre la línea central del asfalto.
 */
export interface OvalTrack {
  centerX: number;
  centerZ: number;
  /** Largo de cada recta. */
  straightLength: number;
  /** Radio de las curvas, medido en la línea central. */
  radius: number;
  /** Ancho del asfalto. */
  width: number;
}

/** Posición y rumbo en el plano. */
export interface Pose {
  x: number;
  z: number;
  heading: Radians;
}

/** Línea central como rectángulo redondeado: con `radius` = alto / 2 forma el estadio. */
export interface TrackRect {
  x: number;
  z: number;
  width: number;
  height: number;
  radius: number;
}

/** Una de las dos curvas: semicírculo con centro en el extremo de las rectas. */
export interface TrackCurve {
  side: 'left' | 'right';
  centerX: number;
  centerZ: number;
  radius: number;
}

/** Línea de meta: atraviesa la recta superior. */
export interface FinishLine {
  /** Centro de la línea. */
  x: number;
  z: number;
  /** Largo a lo ancho de la pista. */
  length: number;
  /** Grosor en el sentido de la marcha. */
  thickness: number;
}
