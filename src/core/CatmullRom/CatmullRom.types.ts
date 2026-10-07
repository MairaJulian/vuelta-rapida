/** Punto del plano, en metros (misma forma que `TrackPoint`). */
export interface PlanePoint {
  x: number;
  z: number;
}

/** Polilínea cerrada remuestreada a distancia constante. */
export interface ResampledLoop {
  /** Puntos a la misma distancia uno de otro; el primero es el primero de la entrada. */
  points: PlanePoint[];
  /** Distancia recorrida desde el primer punto hasta cada punto, en metros. `distances[0]` es 0. */
  distances: number[];
  /** Largo total del lazo, incluido el tramo que vuelve al primer punto. */
  length: number;
}
