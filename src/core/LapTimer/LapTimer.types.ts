/**
 * Vueltas y tiempos de la carrera. Serializable: solo números y listas. Los tiempos
 * se miden en pasos de simulación (`tick`), así son exactos y deterministas.
 */
export interface LapState {
  /** Último paso de simulación procesado. */
  tick: number;
  /** Progreso en ese paso, en metros desde la meta; `null` antes de la primera lectura. */
  progress: number | null;
  /**
   * Puertas pasadas en orden desde la largada. Las puertas se repiten en cada vuelta:
   * meta, puntos de control intermedios, meta otra vez...
   */
  gatesPassed: number;
  /** Paso en que empezó la vuelta en curso; `null` antes de cruzar la meta por primera vez. */
  lapStartTick: number | null;
  /** Duración de cada vuelta completa, en pasos, en orden. */
  lapTicks: number[];
  /** La vuelta más corta de `lapTicks`; `null` sin vueltas completas. */
  bestLapTicks: number | null;
}

/** Lo que necesitan las vueltas del circuito (un `Circuit` lo cumple). */
export interface LapGates {
  /** Largo de la vuelta, en metros. */
  length: number;
  /** Puntos de control intermedios: distancia desde la meta, en orden. */
  checkpoints: number[];
}
