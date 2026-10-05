import type { Radians } from '@/core/MathUtils';

export interface CameraConfig {
  /** Zoom con el auto detenido: cuántos píxeles (dp) ocupa un metro. */
  pixelsPerMeter: number;
  /** Cuánto se aleja la cámara a velocidad máxima, de 0 (nada) a 1. 0.35 = 35 % menos zoom. */
  speedZoomOut: number;
  /** Adelanta la cámara en la dirección de la velocidad, en segundos de recorrido. */
  lookAheadSeconds: number;
  /** Límite del adelanto, como fracción del lado menor de la pantalla. */
  maxLookAheadFraction: number;
  /** Si es true, el mundo gira para que el auto mire siempre hacia arriba. */
  rotateWithCar: boolean;
}

/** Tamaño del área de dibujo, en dp. */
export interface Viewport {
  width: number;
  height: number;
}

/** Lo que muestra la cámara: el punto del mundo que queda en el centro de la pantalla. */
export interface CameraView {
  /** Punto del mundo en el centro de la pantalla, en metros. */
  targetX: number;
  targetZ: number;
  /** dp por metro. */
  scale: number;
  /** Giro de la cámara; el mundo se dibuja girado en sentido contrario. */
  rotation: Radians;
}

/** Punto en pantalla, en dp. */
export interface ScreenPoint {
  x: number;
  y: number;
}
