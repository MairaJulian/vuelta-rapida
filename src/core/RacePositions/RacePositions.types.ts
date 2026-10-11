/** Un auto en la tabla de posiciones: lo que hace falta para ordenarlo. */
export interface PositionEntry {
  id: string;
  /**
   * Distancia de carrera, en metros: vueltas completas por el largo de la vuelta más el
   * progreso en la vuelta actual. Negativa antes de cruzar la meta por primera vez.
   */
  raceDistance: number;
  /** Paso del cronómetro de la llegada; `null` si todavía corre. */
  finishTick: number | null;
}

/** Un auto con su puesto. */
export interface Standing {
  id: string;
  /** Puesto, desde 1. */
  place: number;
}

/** Puesto del jugador y autos en carrera, para el HUD ("2/4"). */
export interface RacePlaceView {
  place: number;
  total: number;
}
