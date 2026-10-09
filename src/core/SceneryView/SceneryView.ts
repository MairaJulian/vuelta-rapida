import type { CameraView, Viewport } from '@/core/Camera';
import { isRoundObject, SCENERY_HEIGHTS, TYRE_DIAMETER } from '@/core/Scenery';
import type { Scenery, SceneryObjectKind } from '@/core/Scenery';
import type { TrackPoint } from '@/core/Track';

import type {
  CellRange,
  SceneryDisplayConfig,
  SceneryGrid,
  SpriteEntry,
  SpriteFrame,
  SpriteLayer,
  SpriteLayerId,
  SpriteLayout,
  SpriteTransform,
} from './SceneryView.types';

/** Cómo se muestra la escenografía al empezar. */
export const DEFAULT_SCENERY_DISPLAY: SceneryDisplayConfig = {
  visible: true,
  parallax: 1,
  grassContrast: 0.6,
  particles: true,
};

/** Lado de las celdas con que se reparte la escenografía para no dibujar lo que no se ve, en metros. */
export const SCENERY_CELL_SIZE = 48;
/** Margen alrededor de la pantalla que se sigue dibujando, en metros: el radio de la copa más grande y su sombra. */
export const VISIBLE_MARGIN = 8;
/**
 * Altura de la cámara imaginaria para el paralaje, en metros. Con intensidad 1, la
 * copa de un árbol de 9 m a 30 m del centro de la pantalla se corre unos 2,5 m.
 */
export const PARALLAX_CAMERA_HEIGHT = 110;
/** Corrimiento de la sombra por cada metro de altura: el sol viene de arriba a la izquierda. */
export const SHADOW_OFFSET = { x: 0.12, z: 0.16 } as const;

/**
 * Alturas de las capas con paralaje, en metros. Cada capa se dibuja con una sola
 * transformación, así que los objetos de alturas parecidas comparten capa.
 */
export const PARALLAX_LEVELS = {
  bushes: SCENERY_HEIGHTS.bush,
  signs: SCENERY_HEIGHTS.billboard,
  treesSmall: SCENERY_HEIGHTS.treeSmall,
  treesLarge: SCENERY_HEIGHTS.treeLarge,
} as const;

/** Capa del atlas de cada tipo de vegetación. */
const LAYER_OF: Partial<Record<SceneryObjectKind, SpriteLayerId>> = {
  bush: 'bushes',
  treeSmall: 'treesSmall',
  treeLarge: 'treesLarge',
};

/**
 * Cuánto se agranda una capa alrededor del centro de la pantalla para simular su
 * altura: 1 en el suelo. Con la cámara mirando desde arriba, lo alto se ve más cerca y
 * se corre hacia afuera del centro; escalar la capa entera alrededor del centro hace
 * exactamente eso, sin calcular nada por objeto. Sin `cameraHeight`, usa
 * `PARALLAX_CAMERA_HEIGHT`.
 */
export function getParallaxScale(height: number, intensity: number, cameraHeight?: number): number {
  'worklet';
  // El valor por defecto se resuelve en el cuerpo: el plugin de worklets no lleva al
  // hilo de UI las constantes usadas como valor por defecto de un parámetro.
  const camera = cameraHeight ?? PARALLAX_CAMERA_HEIGHT;
  return 1 + (Math.max(intensity, 0) * Math.max(height, 0)) / camera;
}

/**
 * Transformación (RSXform) que lleva un dibujo del atlas al mundo: lo escala, lo gira y
 * pone su punto `(anchorX, anchorY)` (en píxeles del recorte) sobre `(x, z)`.
 */
export function getSpriteTransform(
  x: number,
  z: number,
  rotation: number,
  scale: number,
  anchorX: number,
  anchorY: number,
): SpriteTransform {
  'worklet';
  const scos = scale * Math.cos(rotation);
  const ssin = scale * Math.sin(rotation);
  return {
    scos,
    ssin,
    tx: x - (scos * anchorX - ssin * anchorY),
    ty: z - (ssin * anchorX + scos * anchorY),
  };
}

/** Clave de una celda de la grilla. */
export function getCellKey(column: number, row: number): string {
  'worklet';
  return `${column},${row}`;
}

/** Reparte puntos en celdas de `cellSize` metros. Cada celda guarda los índices en orden. */
export function buildSceneryGrid(points: TrackPoint[], cellSize: number): SceneryGrid {
  const cells: Record<string, number[]> = {};
  points.forEach((point, i) => {
    const key = getCellKey(Math.floor(point.x / cellSize), Math.floor(point.z / cellSize));
    (cells[key] ??= []).push(i);
  });
  return { cellSize, cells };
}

/**
 * Celdas que ve la cámara: las que tocan un cuadrado alrededor del centro de la
 * pantalla que contiene el círculo de la pantalla entera más `margin` metros (por
 * defecto, `VISIBLE_MARGIN`). Usar el círculo hace que sirva también con la cámara girada.
 */
export function getVisibleCellRange(
  view: CameraView,
  viewport: Viewport,
  cellSize: number,
  margin?: number,
): CellRange {
  'worklet';
  // Valor por defecto en el cuerpo, no en el parámetro: ver `getParallaxScale`.
  const extra = margin ?? VISIBLE_MARGIN;
  const radius =
    (view.scale > 0 ? Math.hypot(viewport.width, viewport.height) / 2 / view.scale : 0) + extra;
  return {
    minColumn: Math.floor((view.targetX - radius) / cellSize),
    maxColumn: Math.floor((view.targetX + radius) / cellSize),
    minRow: Math.floor((view.targetZ - radius) / cellSize),
    maxRow: Math.floor((view.targetZ + radius) / cellSize),
  };
}

/** Si dos rangos de celdas son iguales (`a` puede faltar: todavía no se calculó). */
export function isSameCellRange(a: CellRange | null, b: CellRange): boolean {
  'worklet';
  return (
    a !== null &&
    a.minColumn === b.minColumn &&
    a.maxColumn === b.maxColumn &&
    a.minRow === b.minRow &&
    a.maxRow === b.maxRow
  );
}

/**
 * Índices de los objetos de las celdas del rango, de menor a mayor: el orden de
 * dibujo es siempre el mismo, entren o salgan celdas, y las copas que se tapan entre
 * sí no cambian de lugar.
 */
export function getItemsInRange(grid: SceneryGrid, range: CellRange): number[] {
  'worklet';
  const items: number[] = [];
  for (let column = range.minColumn; column <= range.maxColumn; column += 1) {
    for (let row = range.minRow; row <= range.maxRow; row += 1) {
      const cell = grid.cells[getCellKey(column, row)];
      if (cell) {
        for (let i = 0; i < cell.length; i += 1) {
          items.push(cell[i]);
        }
      }
    }
  }
  return items.sort((a, b) => a - b);
}

function entryFor(
  x: number,
  z: number,
  diameter: number,
  frame: SpriteFrame,
  padding: number,
): SpriteEntry {
  const drawn = frame.size - 2 * padding;
  const transform = getSpriteTransform(
    x,
    z,
    0,
    drawn > 0 ? diameter / drawn : 0,
    frame.size / 2,
    frame.size / 2,
  );
  return { x, z, frame, ...transform };
}

/**
 * Prepara las capas del atlas a partir de la escenografía: cada árbol y arbusto da
 * una copa (en la capa de su altura) y una sombra (en el suelo, corrida según su
 * altura), y cada neumático de las barreras, un dibujo en el suelo. Los carteles y la
 * tribuna no van en el atlas: son pocos y llevan texto.
 */
export function buildSpriteLayers(
  scenery: Scenery,
  layout: SpriteLayout,
  cellSize: number = SCENERY_CELL_SIZE,
): Record<SpriteLayerId, SpriteLayer> {
  const entries: Record<SpriteLayerId, SpriteEntry[]> = {
    shadows: [],
    tyres: scenery.tyres.map((tyre) =>
      entryFor(tyre.x, tyre.z, TYRE_DIAMETER, layout.tyre, layout.padding),
    ),
    bushes: [],
    treesSmall: [],
    treesLarge: [],
  };
  for (const object of scenery.objects) {
    const layer = LAYER_OF[object.kind];
    if (!layer || !isRoundObject(object.kind)) {
      continue;
    }
    const tints =
      object.kind === 'treeLarge'
        ? layout.treeLarge
        : object.kind === 'treeSmall'
          ? layout.treeSmall
          : layout.bush;
    const shadow =
      object.kind === 'treeLarge'
        ? layout.shadowLarge
        : object.kind === 'treeSmall'
          ? layout.shadowSmall
          : layout.shadowBush;
    const tint = tints[Math.abs(Math.round(object.variant)) % tints.length];
    const height = SCENERY_HEIGHTS[object.kind];
    entries[layer].push(entryFor(object.x, object.z, object.length, tint, layout.padding));
    entries.shadows.push(
      entryFor(
        object.x + SHADOW_OFFSET.x * height,
        object.z + SHADOW_OFFSET.z * height,
        object.length,
        shadow,
        layout.padding,
      ),
    );
  }
  const layerOf = (id: SpriteLayerId): SpriteLayer => ({
    entries: entries[id],
    grid: buildSceneryGrid(entries[id], cellSize),
  });
  return {
    shadows: layerOf('shadows'),
    tyres: layerOf('tyres'),
    bushes: layerOf('bushes'),
    treesSmall: layerOf('treesSmall'),
    treesLarge: layerOf('treesLarge'),
  };
}
