/**
 * Colores de las partículas, como RGB de 0 a 1 (los usa el atlas para teñir el
 * círculo blanco de la textura). La opacidad la pone cada partícula.
 */
export const TINTS = {
  /** oklch(0.82 0.05 80) ≈ #D5C1A0: polvo del borde, tierra clara. */
  dust: [213 / 255, 193 / 255, 160 / 255],
  /** bg del handoff, #F6F7F9: humo de las gomas. */
  smoke: [246 / 255, 247 / 255, 249 / 255],
} as const;
