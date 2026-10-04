export interface BoxMotionState {
  /** Posición horizontal del borde izquierdo del rectángulo, en px. */
  x: number;
  /** 1 se mueve a la derecha, -1 a la izquierda. */
  direction: 1 | -1;
}

export interface BoxMotionConfig {
  /** Velocidad en px por segundo. */
  speed: number;
  /** Ancho del rectángulo, en px. */
  boxWidth: number;
  /** Ancho del área por donde se mueve, en px. */
  areaWidth: number;
}
