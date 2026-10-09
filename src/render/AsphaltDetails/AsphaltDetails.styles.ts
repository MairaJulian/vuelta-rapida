/**
 * Constantes visuales de los detalles del asfalto: variaciones sutiles del gris de la
 * pista del handoff (`oklch(0.46 0.015 260)`), convertidas a hex. Sin transparencias:
 * el handoff pide no apilar capas translúcidas.
 */
export const COLORS = {
  /** oklch(0.49 0.015 260): parche un poco más claro. */
  patchLight: '#5B6169',
  /** oklch(0.43 0.015 260): parche un poco más oscuro. */
  patchDark: '#4B5058',
  /** oklch(0.38 0.012 260): goma de las marcas de frenada. */
  skid: '#3F4349',
} as const;
