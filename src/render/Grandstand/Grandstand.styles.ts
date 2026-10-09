/**
 * Constantes visuales de la tribuna, vista desde arriba. Grises claros de la paleta
 * del handoff para las gradas y el techo azul; el público en los colores de los autos.
 * Medidas en metros, en coordenadas de la tribuna: x a lo largo, y hacia atrás (el
 * frente, con el público, mira a la pista en y negativa).
 */
export const COLORS = {
  /** oklch(0.93 0.008 260): gradas. */
  stands: '#E5E8ED',
  /** line: escalones y baranda del frente. */
  steps: '#CFD3DA',
  /** blue: techo. */
  roof: '#2F6BDD',
  /** blue-pressed: borde del techo. */
  roofEdge: '#1F55BC',
  /** Vigas del techo. */
  beams: '#E9EFFC',
} as const;

/** Colores del público: los de los autos elegibles del handoff. */
export const SPECTATOR_COLORS = [
  '#2F6BDD',
  '#E04A3A',
  '#C6EB4C',
  '#14171F',
  '#00BEB7',
  '#F99532',
  '#FFFFFF',
] as const;

export const LAYOUT = {
  /** Radio de las esquinas de las gradas. */
  radius: 0.6,
  /** Grosor de la baranda del frente. */
  rail: 0.3,
  /** Filas de público, desde el frente. */
  rows: 5,
  /** Profundidad de cada fila y espacio libre antes de la primera. */
  rowDepth: 1.3,
  frontGap: 0.6,
  /** Grosor de cada escalón. */
  step: 0.16,
  /** Separación entre espectadores y diámetro de cada uno. */
  seat: 1.1,
  spectator: 0.75,
  /** Dónde empieza el techo, desde el centro hacia atrás (cubre las últimas filas). */
  roofFrom: -0.2,
  /** Ancho del borde del techo y de cada viga. */
  roofEdge: 0.5,
  beam: 0.25,
  /** Vigas a lo largo del techo. */
  beams: 5,
} as const;
