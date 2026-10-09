/**
 * Celdas de la grilla que ve la cámara, inclusive. Las columnas van sobre x y las
 * filas sobre z.
 */
export interface CellRange {
  minColumn: number;
  maxColumn: number;
  minRow: number;
  maxRow: number;
}

/** Objetos repartidos en celdas cuadradas: índices de cada celda, por clave "columna,fila". */
export interface SceneryGrid {
  /** Lado de cada celda, en metros. */
  cellSize: number;
  cells: Record<string, number[]>;
}

/** Recorte cuadrado de la textura (atlas), en píxeles. */
export interface SpriteFrame {
  x: number;
  y: number;
  /** Lado, en píxeles. */
  size: number;
}

/**
 * Dónde está cada dibujo en la textura de la escenografía. Cada dibujo es un círculo
 * centrado en su recorte, con `padding` píxeles libres alrededor. Los árboles y
 * arbustos traen un recorte por tono.
 */
export interface SpriteLayout {
  padding: number;
  treeLarge: SpriteFrame[];
  treeSmall: SpriteFrame[];
  bush: SpriteFrame[];
  shadowLarge: SpriteFrame;
  shadowSmall: SpriteFrame;
  shadowBush: SpriteFrame;
  tyre: SpriteFrame;
}

/** Capas de la escenografía que se dibujan con un atlas. */
export type SpriteLayerId = 'shadows' | 'tyres' | 'bushes' | 'treesSmall' | 'treesLarge';

/**
 * Un dibujo del atlas ubicado en el mundo: su recorte de la textura y la
 * transformación (RSXform: escala por coseno y seno del giro, más traslación) que lo
 * lleva de píxeles de la textura a metros.
 */
export interface SpriteEntry {
  /** Centro en el mundo, en metros: decide la celda. */
  x: number;
  z: number;
  /** Recorte de la textura, en píxeles. */
  frame: SpriteFrame;
  scos: number;
  ssin: number;
  tx: number;
  ty: number;
}

/** Una capa del atlas: sus dibujos, en orden, y la grilla para elegir los visibles. */
export interface SpriteLayer {
  entries: SpriteEntry[];
  grid: SceneryGrid;
}

/** Cómo se muestra la escenografía. Se ajusta en el panel de desarrollo. */
export interface SceneryDisplayConfig {
  /** Si se dibuja la escenografía (árboles, carteles, tribuna, barreras, detalles del asfalto). */
  visible: boolean;
  /** Intensidad del paralaje: 0 lo apaga, 1 es lo normal. */
  parallax: number;
  /** Contraste de las franjas del pasto, de 0 (liso) a 1. */
  grassContrast: number;
  /** Si hay partículas de polvo y humo. */
  particles: boolean;
}

/** Transformación de un dibujo del atlas (RSXform), en números. */
export interface SpriteTransform {
  scos: number;
  ssin: number;
  tx: number;
  ty: number;
}
