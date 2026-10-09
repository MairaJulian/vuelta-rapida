export interface ConfettiProps {
  /** Ancho y alto del área donde caen, en dp. */
  width: number;
  height: number;
  /** Cantidad de papelitos. Por defecto, 32. */
  pieces?: number;
  /** Duración de la caída, en ms. Por defecto, 2600. */
  durationMs?: number;
}

/** Un papelito: dónde arranca, cuándo, cuánto gira y su color. */
export interface ConfettiPiece {
  /** Posición horizontal, de 0 a 1 del ancho. */
  x: number;
  /** Demora antes de empezar a caer, de 0 a 1 de la duración. */
  delay: number;
  /** Vueltas que da al caer (con signo). */
  spins: number;
  /** Cuánto se mece de lado a lado, en dp. */
  sway: number;
  color: string;
}
