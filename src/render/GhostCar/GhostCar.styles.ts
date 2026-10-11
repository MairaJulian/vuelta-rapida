/** Nombre del dueño sobre el fantasma. Medidas en metros del mundo (el auto mide 2 × 4,5 m). */
export const LABEL = {
  fontFamily: 'sans-serif',
  /** Chico: el nombre es una pista, no tiene que tapar la pista. */
  fontSize: 1.25,
  /** Margen del fondo alrededor del texto. */
  paddingX: 0.55,
  paddingY: 0.35,
  /** Fondo blanco casi opaco, para que se lea sobre el asfalto y el pasto. */
  background: 'rgba(255, 255, 255, 0.85)',
  /** ink */
  text: '#14171F',
} as const;
