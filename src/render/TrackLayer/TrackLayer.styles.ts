/**
 * Constantes visuales de la pista. Colores de docs/design (EscenaPista y README),
 * convertidos de oklch a hex. Grosores relativos al ancho del asfalto, con la
 * misma proporción que el handoff (piano 138, borde 120, asfalto 110). Las medidas
 * en dp del handoff pasan a metros con el asfalto de 110 dp = 14 m (1 dp ≈ 0,127 m).
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
  sign: '#FFFFFF',
  /** ink */
  signText: '#14171F',
} as const;

/** Grosor del borde blanco respecto del asfalto. */
export const EDGE_RATIO = 120 / 110;
/** Grosor de los pianos (solo en curvas) respecto del asfalto. */
export const CURB_RATIO = 138 / 110;
/** Largo de cada raya del piano, en metros (12 dp del handoff a escala). */
export const CURB_DASH = 0.9;

/** Franjas diagonales del césped: dan referencia de movimiento en cualquier dirección. */
export const GRASS_STRIPE_PERIOD = 12;

/**
 * Lado aproximado de cada cuadro de la bandera, en metros (7 dp del handoff). Se
 * ajusta para que entre un número entero de cuadros a lo ancho y a lo largo.
 */
export const FINISH_SQUARE = 0.9;

/**
 * Cartel "META" (EscenaPista): píldora blanca de 64 × 22 dp con texto itálico de
 * 12 dp, al costado de la pista. En metros.
 */
export const FINISH_SIGN = {
  /** En el sentido de la marcha. */
  length: 8.1,
  /** A lo ancho de la pista. */
  depth: 2.8,
  radius: 1.4,
  /** Separación del borde de la pista y de la línea. */
  gap: 1.2,
  fontSize: 1.5,
  text: 'META',
} as const;
