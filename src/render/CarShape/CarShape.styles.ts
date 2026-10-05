/**
 * Silueta del monoplaza del handoff (docs/design, Monoplaza.dc.html): viewBox de
 * 40 × 90 mirando hacia arriba. Se escala a 2 × 4,5 m.
 */
export const COLORS = {
  /** blue: color del jugador por defecto */
  body: '#2F6BDD',
  /** alerones y ruedas */
  dark: '#201E1D',
  helmet: '#EDBB00',
  numberDisc: '#F3F2F2',
} as const;

export const VIEWBOX = { width: 40, height: 90 } as const;

/** Ancho real del auto en metros. */
export const CAR_WIDTH_METERS = 2;

/** Metros por unidad del viewBox. */
export const CAR_SCALE = CAR_WIDTH_METERS / VIEWBOX.width;

export const SHAPES = {
  rearTires: [
    { x: 1.5, y: 58, width: 9, height: 17, r: 2 },
    { x: 29.5, y: 58, width: 9, height: 17, r: 2 },
  ],
  frontTires: [
    { x: 3, y: 13, width: 7.5, height: 13, r: 2 },
    { x: 29.5, y: 13, width: 7.5, height: 13, r: 2 },
  ],
  frontAxle: { x: 5, y: 20, width: 30, height: 1.6 },
  rearAxle: { x: 7, y: 64, width: 26, height: 1.6 },
  body: 'M12 36 C12 31 16 29 20 29 C24 29 28 31 28 36 L30.5 54 C30.5 64 26 74 22.5 79 L17.5 79 C14 74 9.5 64 9.5 54 Z',
  nose: 'M17.2 6 L22.8 6 L24.2 32 L15.8 32 Z',
  frontWing: { x: 2.5, y: 3, width: 35, height: 5, r: 1 },
  endplates: [
    { x: 2.5, y: 2, width: 3, height: 7 },
    { x: 34.5, y: 2, width: 3, height: 7 },
  ],
  rearWing: { x: 3.5, y: 80, width: 33, height: 7, r: 1 },
  cockpit: { x: 15.8, y: 35.5, width: 8.4, height: 13 },
  helmet: { cx: 20, cy: 43, r: 2.7 },
  halo: 'M15 37 Q20 31 25 37',
  haloWidth: 1.6,
  numberDisc: { cx: 20, cy: 61, r: 6.2 },
} as const;
