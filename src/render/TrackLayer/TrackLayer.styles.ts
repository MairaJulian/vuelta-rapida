/**
 * Constantes visuales de la pista. Colores de docs/design (EscenaPista y README),
 * convertidos de oklch a hex. Grosores relativos al ancho del asfalto, con la
 * misma proporción que el handoff (piano 138, borde 120, asfalto 110).
 */
export const COLORS = {
  /** oklch(0.9 0.05 150) */
  grass: '#C8E8CD',
  /** oklch(0.84 0.07 150): franjas del césped cortado */
  grassStripe: '#ABD8B3',
  /** oklch(0.46 0.015 260) */
  asphalt: '#535861',
  edge: '#FFFFFF',
  curb: '#FFFFFF',
  /** coral: pianos */
  curbStripe: '#E04A3A',
  finishLight: '#FFFFFF',
  /** ink */
  finishDark: '#14171F',
} as const;

/** Grosor del borde blanco respecto del asfalto. */
export const EDGE_RATIO = 120 / 110;
/** Grosor de los pianos (solo en curvas) respecto del asfalto. */
export const CURB_RATIO = 138 / 110;
/** Largo de cada raya del piano, en metros (12 dp del handoff a escala). */
export const CURB_DASH = 0.9;

/** Franjas diagonales del césped: dan referencia de movimiento en cualquier dirección. */
export const GRASS_STRIPE_PERIOD = 12;
/** Cuánto césped con franjas se dibuja alrededor de la pista, en metros. */
export const GRASS_MARGIN = 150;

/** Lado de cada cuadro de la bandera a cuadros, en metros. */
export const FINISH_SQUARE = 0.5;
