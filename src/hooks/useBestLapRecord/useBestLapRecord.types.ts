export interface UseBestLapRecordParams {
  /** `id` del circuito: la clave del récord guardado. */
  circuitId: string;
  /** Pasos de simulación por segundo, para pasar las vueltas a milisegundos. */
  stepHz: number;
}

export interface UseBestLapRecordResult {
  /** Récord guardado del circuito, en milisegundos; `null` si todavía no hay. */
  recordMs: number | null;
  /**
   * Guarda una vuelta, medida en pasos, si mejora el récord. Siempre es la misma
   * función mientras no cambien el circuito ni `stepHz`, así se le puede pasar al loop.
   */
  saveLap: (lapTicks: number) => void;
}
