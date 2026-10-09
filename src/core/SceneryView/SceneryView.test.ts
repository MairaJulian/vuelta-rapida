import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { generateScenery, SCENERY_HEIGHTS, TYRE_DIAMETER } from '@/core/Scenery';
import type { Scenery } from '@/core/Scenery';

import {
  buildSceneryGrid,
  buildSpriteLayers,
  getItemsInRange,
  getParallaxScale,
  getSpriteTransform,
  getVisibleCellRange,
  isSameCellRange,
  PARALLAX_CAMERA_HEIGHT,
  SCENERY_CELL_SIZE,
  SHADOW_OFFSET,
} from './SceneryView';
import type { SpriteLayout } from './SceneryView.types';

const LAYOUT: SpriteLayout = {
  padding: 2,
  treeLarge: [
    { x: 0, y: 0, size: 100 },
    { x: 100, y: 0, size: 100 },
    { x: 200, y: 0, size: 100 },
  ],
  treeSmall: [{ x: 0, y: 100, size: 50 }],
  bush: [{ x: 50, y: 100, size: 20 }],
  shadowLarge: { x: 300, y: 0, size: 100 },
  shadowSmall: { x: 100, y: 100, size: 50 },
  shadowBush: { x: 150, y: 100, size: 20 },
  tyre: { x: 170, y: 100, size: 20 },
};

/** Aplica un RSXform a un punto del recorte (en píxeles). */
const apply = (
  t: { scos: number; ssin: number; tx: number; ty: number },
  u: number,
  v: number,
) => ({
  x: t.scos * u - t.ssin * v + t.tx,
  z: t.ssin * u + t.scos * v + t.ty,
});

describe('getParallaxScale', () => {
  it('es 1 en el suelo o sin intensidad, y crece con la altura', () => {
    expect(getParallaxScale(0, 1)).toBe(1);
    expect(getParallaxScale(9, 0)).toBe(1);
    expect(getParallaxScale(9, 1)).toBeCloseTo(1 + 9 / PARALLAX_CAMERA_HEIGHT, 12);
    expect(getParallaxScale(9, 2)).toBeGreaterThan(getParallaxScale(9, 1));
    expect(getParallaxScale(6, 1)).toBeLessThan(getParallaxScale(9, 1));
  });

  it('una intensidad negativa cuenta como 0', () => {
    expect(getParallaxScale(9, -1)).toBe(1);
  });
});

describe('getSpriteTransform', () => {
  it('pone el ancla del recorte sobre el punto del mundo, con la escala pedida', () => {
    const t = getSpriteTransform(10, 20, 0, 0.5, 50, 50);
    expect(apply(t, 50, 50)).toEqual({ x: 10, z: 20 });
    // 100 píxeles a 0,5 m por píxel: 50 m.
    expect(apply(t, 100, 50).x - apply(t, 0, 50).x).toBeCloseTo(50, 12);
  });

  it('gira alrededor del ancla', () => {
    const t = getSpriteTransform(0, 0, Math.PI / 2, 1, 10, 10);
    const right = apply(t, 20, 10);
    expect(right.x).toBeCloseTo(0, 12);
    expect(right.z).toBeCloseTo(10, 12);
  });
});

describe('celdas visibles', () => {
  const view = { targetX: 100, targetZ: -50, scale: 10, rotation: 0 };
  const viewport = { width: 800, height: 360 };

  it('cubren la pantalla entera más el margen, alrededor del centro', () => {
    const range = getVisibleCellRange(view, viewport, 48, 8);
    // Radio: la mitad de la diagonal (438,6 dp) a 10 dp por metro, más 8 m.
    const radius = Math.hypot(800, 360) / 2 / 10 + 8;
    expect(range.minColumn).toBe(Math.floor((100 - radius) / 48));
    expect(range.maxColumn).toBe(Math.floor((100 + radius) / 48));
    expect(range.minRow).toBe(Math.floor((-50 - radius) / 48));
    expect(range.maxRow).toBe(Math.floor((-50 + radius) / 48));
  });

  it('con menos zoom se ven más celdas', () => {
    const near = getVisibleCellRange(view, viewport, 48);
    const far = getVisibleCellRange({ ...view, scale: 4 }, viewport, 48);
    expect(far.maxColumn - far.minColumn).toBeGreaterThan(near.maxColumn - near.minColumn);
  });

  it('isSameCellRange compara los cuatro bordes', () => {
    const range = getVisibleCellRange(view, viewport, 48);
    expect(isSameCellRange(null, range)).toBe(false);
    expect(isSameCellRange({ ...range }, range)).toBe(true);
    expect(isSameCellRange({ ...range, maxRow: range.maxRow + 1 }, range)).toBe(false);
  });

  it('getItemsInRange junta los índices de las celdas, siempre en el mismo orden', () => {
    const points = [
      { x: 5, z: 5 },
      { x: 60, z: 5 },
      { x: 5, z: 60 },
      { x: 200, z: 200 },
      { x: 10, z: 10 },
    ];
    const grid = buildSceneryGrid(points, 48);
    expect(grid.cells['0,0']).toEqual([0, 4]);
    const items = getItemsInRange(grid, { minColumn: 0, maxColumn: 1, minRow: 0, maxRow: 1 });
    expect(items).toEqual([0, 1, 2, 4]);
  });
});

describe('buildSpriteLayers', () => {
  const scenery: Scenery = generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 1 });
  const layers = buildSpriteLayers(scenery, LAYOUT);
  const count = (kind: string) => scenery.objects.filter((object) => object.kind === kind).length;

  it('una copa por árbol o arbusto, en la capa de su altura, y una sombra por cada uno', () => {
    expect(layers.treesLarge.entries).toHaveLength(count('treeLarge'));
    expect(layers.treesSmall.entries).toHaveLength(count('treeSmall'));
    expect(layers.bushes.entries).toHaveLength(count('bush'));
    expect(layers.shadows.entries).toHaveLength(
      count('treeLarge') + count('treeSmall') + count('bush'),
    );
  });

  it('la copa queda centrada en el árbol y mide su diámetro', () => {
    const tree = scenery.objects.find((object) => object.kind === 'treeLarge')!;
    const entry = layers.treesLarge.entries[0];
    expect(entry.frame).toBe(LAYOUT.treeLarge[tree.variant]);
    const center = apply(entry, 50, 50);
    expect(center.x).toBeCloseTo(tree.x, 9);
    expect(center.z).toBeCloseTo(tree.z, 9);
    // El círculo dibujado ocupa el recorte menos el margen (96 px).
    expect(apply(entry, 98, 50).x - apply(entry, 2, 50).x).toBeCloseTo(tree.length, 9);
  });

  it('la sombra se corre según la altura, hacia abajo a la derecha', () => {
    const tree = scenery.objects.find((object) => object.kind === 'treeLarge')!;
    const index = scenery.objects
      .filter((object) => ['treeLarge', 'treeSmall', 'bush'].includes(object.kind))
      .indexOf(tree);
    const shadow = layers.shadows.entries[index];
    const center = apply(shadow, 50, 50);
    expect(center.x).toBeCloseTo(tree.x + SHADOW_OFFSET.x * SCENERY_HEIGHTS.treeLarge, 9);
    expect(center.z).toBeCloseTo(tree.z + SHADOW_OFFSET.z * SCENERY_HEIGHTS.treeLarge, 9);
    expect(shadow.frame).toBe(LAYOUT.shadowLarge);
  });

  it('cada neumático de las barreras es un dibujo del suelo, de su diámetro', () => {
    expect(layers.tyres.entries).toHaveLength(scenery.tyres.length);
    const [tyre] = scenery.tyres;
    const [entry] = layers.tyres.entries;
    expect(entry.frame).toBe(LAYOUT.tyre);
    const center = apply(entry, 10, 10);
    expect(center.x).toBeCloseTo(tyre.x, 9);
    expect(center.z).toBeCloseTo(tyre.z, 9);
    expect(apply(entry, 18, 10).x - apply(entry, 2, 10).x).toBeCloseTo(TYRE_DIAMETER, 9);
  });

  it('cada capa trae su grilla con todos sus dibujos', () => {
    const indices = Object.values(layers.treesLarge.grid.cells)
      .flat()
      .sort((a, b) => a - b);
    expect(indices).toEqual(layers.treesLarge.entries.map((_, i) => i));
    expect(layers.treesLarge.grid.cellSize).toBe(SCENERY_CELL_SIZE);
  });

  it('en pantalla se dibuja una parte chica de los árboles', () => {
    const view = { targetX: -93, targetZ: 165, scale: 9, rotation: 0 };
    const range = getVisibleCellRange(view, { width: 800, height: 360 }, SCENERY_CELL_SIZE);
    const visible = getItemsInRange(layers.treesLarge.grid, range);
    expect(visible.length).toBeLessThan(layers.treesLarge.entries.length / 4);
  });

  it('los carteles y la tribuna no van en el atlas', () => {
    const empty = buildSpriteLayers(
      { ...scenery, objects: scenery.objects.filter((object) => object.kind === 'billboard') },
      LAYOUT,
    );
    expect(empty.shadows.entries).toEqual([]);
    expect(empty.treesLarge.entries).toEqual([]);
  });
});
