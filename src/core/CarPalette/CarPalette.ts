import type { CarColor, CarColorId } from './CarPalette.types';

const WHITE = '#FFFFFF';
/** ink del handoff */
const INK = '#14171F';

/**
 * Paleta de autos del handoff (README §Colores, convertida de OKLCH a hex), con un
 * cambio: Rosa en lugar de Tinta. Una carrocería tinta se confunde con las gomas y los
 * alerones (también tinta) y en la pista el auto pierde la silueta.
 */
export const CAR_COLORS: readonly CarColor[] = Object.freeze([
  { id: 'blue', name: 'Azul', hex: '#2F6BDD', numberColor: WHITE },
  { id: 'coral', name: 'Coral', hex: '#F1453B', numberColor: WHITE },
  { id: 'lime', name: 'Lima', hex: '#C6EB4C', numberColor: INK },
  { id: 'pink', name: 'Rosa', hex: '#F164AF', numberColor: INK },
  { id: 'teal', name: 'Turquesa', hex: '#00BEB7', numberColor: INK },
  { id: 'violet', name: 'Violeta', hex: '#7E4ED7', numberColor: WHITE },
  { id: 'orange', name: 'Naranja', hex: '#F99532', numberColor: INK },
  { id: 'white', name: 'Blanco', hex: WHITE, numberColor: INK },
]);

/** El azul de la escudería Cóndor: el color de un auto sin perfil. */
export const DEFAULT_CAR_COLOR_ID: CarColorId = 'blue';

export function isCarColorId(value: unknown): value is CarColorId {
  return CAR_COLORS.some((color) => color.id === value);
}

/** Color de la paleta; un id desconocido (de una versión vieja o futura) da el azul. */
export function getCarColor(id: string): CarColor {
  return (
    CAR_COLORS.find((color) => color.id === id) ??
    CAR_COLORS.find((color) => color.id === DEFAULT_CAR_COLOR_ID)!
  );
}

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** Color hex (`#RRGGBB`) en OKLab: `[L, a, b]`. */
export function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((start) =>
    toLinear(parseInt(hex.slice(start, start + 2), 16) / 255),
  );
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * Diferencia entre dos colores hex, como distancia en OKLab (0 = iguales; negro y
 * blanco están a 1). Sirve para comprobar que un color se distingue de otro.
 */
export function colorDistance(first: string, second: string): number {
  const a = hexToOklab(first);
  const b = hexToOklab(second);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
