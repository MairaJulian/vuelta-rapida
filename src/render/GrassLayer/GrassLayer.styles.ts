/**
 * Constantes visuales del pasto. Colores de docs/design (EscenaPista, tema claro),
 * convertidos de oklch a hex.
 */
export const COLORS = {
  /** oklch(0.9 0.05 150): el pasto del handoff. */
  grass: '#C8E8CD',
  /** oklch(0.84 0.07 150): la franja más oscura, con el contraste al máximo. */
  stripe: '#ABD8B3',
} as const;

/** Ancho de cada franja de corte, en metros: una clara y una oscura cada 16 m. */
export const STRIPE_WIDTH = 8;
