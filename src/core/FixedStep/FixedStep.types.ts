export interface FixedStepConfig {
  /** Pasos de simulación por segundo. */
  stepHz: number;
  /** Tiempo máximo que se acepta de un solo cuadro, en ms. Evita la "espiral de la muerte". */
  maxFrameMs: number;
}

export interface FixedStepResult {
  /** Cuántos pasos fijos hay que ejecutar en este cuadro. */
  steps: number;
  /** Tiempo que queda acumulado para el próximo cuadro, en ms. */
  accumulatorMs: number;
}
