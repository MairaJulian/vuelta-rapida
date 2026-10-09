/**
 * Constantes visuales de los carteles. Colores de la paleta del handoff (README de
 * docs/design): ink, blue, coral, lime y blanco.
 */
const INK = '#14171F';
const WHITE = '#FFFFFF';

export const COLORS = {
  /** Cartel de distancia: blanco con el número en ink y una franja coral abajo. */
  distancePlate: WHITE,
  distanceText: INK,
  distanceStripe: '#E04A3A',
} as const;

/**
 * Colores de cada marca, en el orden de `BILLBOARD_BRANDS` (core/Scenery): fondo y
 * texto. Los fondos oscuros llevan texto blanco, como los autos del handoff.
 */
export const BRAND_STYLES = [
  /** RAYO MATE: lima */
  { plate: '#C6EB4C', text: INK },
  /** GOMAS ÑANDÚ: ink */
  { plate: INK, text: WHITE },
  /** ALFAJORES COMETA: coral */
  { plate: '#E04A3A', text: WHITE },
  /** LUBRI TERO: azul */
  { plate: '#2F6BDD', text: WHITE },
  /** RADIO VELOZ: blanco con texto azul */
  { plate: WHITE, text: '#2F6BDD' },
] as const;

/** Radio de las esquinas de los carteles, en metros. */
export const PLATE_RADIUS = 0.35;
/** Alto de la franja coral del cartel de distancia, en metros. */
export const STRIPE_HEIGHT = 0.35;
/** Alto del texto, en metros: el número del cartel de distancia y la marca. */
export const TEXT_SIZE = { distance: 1.15, billboard: 1.1 } as const;
/** Parte del largo del cartel que puede ocupar el texto. */
export const TEXT_FILL = 0.86;
/** La fuente se crea de 1 m y se escala: un solo objeto para todos los carteles. */
export const FONT_SIZE = 1;
