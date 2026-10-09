import type { SpriteFrame, SpriteLayout } from '@/core/SceneryView';

/**
 * Textura (atlas) de la escenografía: árboles, arbustos, sombras y la partícula,
 * dibujados como vectores con la paleta del handoff y rasterizados una sola vez.
 * Colores en oklch con el tono del pasto (150), convertidos a hex.
 */
export const COLORS = {
  /** Copa de cada tono de árbol (base y luz). */
  trees: [
    /** oklch(0.62 0.115 150) / oklch(0.72 0.12 148) */
    { base: '#4D9960', light: '#6DB979' },
    /** oklch(0.67 0.125 142) / oklch(0.76 0.125 140) */
    { base: '#66A85F', light: '#85C577' },
    /** oklch(0.57 0.1 158) / oklch(0.67 0.11 155) */
    { base: '#3B8960', light: '#58A977' },
  ],
  /** oklch(0.8 0.12 132): brillo de las copas y de los arbustos. */
  sparkle: '#A1CE7C',
  /** Arbustos: oklch(0.7 0.13 138), oklch(0.74 0.12 130), oklch(0.66 0.12 146). */
  bushes: ['#75B15F', '#92BA66', '#5EA664'],
  /** oklch(0.81 0.065 152): sombra sólida sobre el pasto, sin transparencia. */
  shadow: '#A2CEAD',
  /** Partícula: blanca, el color y la opacidad los pone cada partícula. */
  particle: '#FFFFFF',
  /** ink: neumático de las barreras, como en la escena del handoff. */
  tyre: '#14171F',
  /** ink-2: el agujero del neumático. */
  tyreHole: '#3A404C',
} as const;

/** Diámetro del agujero del neumático respecto del neumático. */
export const TYRE_HOLE_RATIO = 0.4;

/** Píxeles libres alrededor de cada dibujo, para que no se mezcle con el vecino al escalar. */
export const SPRITE_PADDING = 4;

const frame = (x: number, y: number, size: number): SpriteFrame => ({ x, y, size });

/** Dónde está cada dibujo en la textura, en píxeles. */
export const SPRITE_LAYOUT: SpriteLayout = {
  padding: SPRITE_PADDING,
  treeLarge: [frame(0, 0, 256), frame(256, 0, 256), frame(512, 0, 256)],
  shadowLarge: frame(768, 0, 256),
  treeSmall: [frame(0, 256, 192), frame(192, 256, 192), frame(384, 256, 192)],
  shadowSmall: frame(576, 256, 192),
  bush: [frame(0, 448, 96), frame(96, 448, 96), frame(192, 448, 96)],
  shadowBush: frame(288, 448, 96),
  tyre: frame(448, 448, 64),
};

/** La partícula: un círculo blanco. */
export const PARTICLE_FRAME: SpriteFrame = frame(384, 448, 64);

/** Tamaño de la textura, en píxeles. */
export const ATLAS_SIZE = { width: 1024, height: 544 } as const;
