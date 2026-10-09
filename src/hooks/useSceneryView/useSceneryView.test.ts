import { renderHook } from '@testing-library/react-native';
import { useFrameCallback } from 'react-native-reanimated';

import type { CameraView } from '@/core/Camera';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { generateScenery } from '@/core/Scenery';
import {
  buildSpriteLayers,
  getItemsInRange,
  getParallaxScale,
  getVisibleCellRange,
  PARALLAX_LEVELS,
  SCENERY_CELL_SIZE,
} from '@/core/SceneryView';
import { SPRITE_LAYOUT } from '@/render/SceneryAtlas';

import { useSceneryView } from './useSceneryView';
import type { UseSceneryViewParams } from './useSceneryView.types';

const scenery = generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 1 });
const layers = buildSpriteLayers(scenery, SPRITE_LAYOUT, SCENERY_CELL_SIZE);
const VIEWPORT = { width: 800, height: 360 };

/** Valor compartido simple, que el test puede mover entre cuadros. */
function cameraAt(view: CameraView) {
  const shared = {
    value: view,
    get: () => shared.value,
    set: (next: CameraView) => (shared.value = next),
  };
  return shared;
}

async function renderView(overrides: Partial<UseSceneryViewParams> = {}) {
  const camera = cameraAt({ targetX: -93, targetZ: 165, scale: 9, rotation: 0 });
  const hook = await renderHook(
    (props: Partial<UseSceneryViewParams>) =>
      useSceneryView({
        scenery,
        cameraView: camera as never,
        viewport: VIEWPORT,
        parallax: 1,
        ...props,
      }),
    { initialProps: overrides },
  );
  const frame = () => {
    const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
    callback({ timestamp: 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 });
  };
  return { ...hook, camera, frame };
}

describe('useSceneryView', () => {
  it('antes del primer cuadro no dibuja nada', async () => {
    const { result } = await renderView();
    expect(result.current.atlas.treesLarge.transforms.value).toEqual([]);
  });

  it('entrega al atlas solo los árboles de las celdas que ve la cámara', async () => {
    const { result, camera, frame } = await renderView();
    frame();
    const range = getVisibleCellRange(camera.value, VIEWPORT, SCENERY_CELL_SIZE);
    const visible = getItemsInRange(layers.treesLarge.grid, range);
    const { sprites, transforms } = result.current.atlas.treesLarge;
    expect(transforms.value).toHaveLength(visible.length);
    expect(sprites.value).toHaveLength(visible.length);
    expect(visible.length).toBeLessThan(layers.treesLarge.entries.length);
    // Cada uno con su recorte y su transformación, en orden.
    const first = layers.treesLarge.entries[visible[0]];
    expect(transforms.value[0]).toMatchObject({ scos: first.scos, tx: first.tx, ty: first.ty });
    expect(sprites.value[0]).toEqual({
      x: first.frame.x,
      y: first.frame.y,
      width: first.frame.size,
      height: first.frame.size,
    });
    // Las sombras de todo lo visible van en su propia capa.
    expect(result.current.atlas.shadows.transforms.value.length).toBeGreaterThan(0);
  });

  it('no rearma las listas mientras la cámara siga en las mismas celdas', async () => {
    const { result, camera, frame } = await renderView();
    frame();
    const before = result.current.atlas.treesLarge.transforms.value;
    camera.set({ ...camera.value, targetX: camera.value.targetX + 0.5 });
    frame();
    expect(result.current.atlas.treesLarge.transforms.value).toBe(before);
    // Lejos, en otras celdas: otra lista.
    camera.set({ ...camera.value, targetX: camera.value.targetX + 300 });
    frame();
    expect(result.current.atlas.treesLarge.transforms.value).not.toBe(before);
  });

  it('sin escenografía deja el atlas vacío', async () => {
    const { result, frame } = await renderView({ scenery: undefined });
    frame();
    expect(result.current.atlas.treesLarge.transforms.value).toEqual([]);
    expect(result.current.atlas.shadows.sprites.value).toEqual([]);
  });

  it('al cambiar la escenografía, el próximo cuadro arma las listas nuevas', async () => {
    const { result, frame, rerender } = await renderView();
    frame();
    const before = result.current.atlas.treesLarge.transforms.value.length;
    await rerender({ scenery: generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 0 }) });
    frame();
    expect(before).toBeGreaterThan(0);
    expect(result.current.atlas.treesLarge.transforms.value).toEqual([]);
  });

  it('cada capa con paralaje escala alrededor del centro de la pantalla según su altura', async () => {
    const { result, camera } = await renderView({ parallax: 2 });
    const { targetX, targetZ } = camera.value;
    expect(result.current.levels.treesLarge.value).toEqual([
      { translateX: targetX },
      { translateY: targetZ },
      { scale: getParallaxScale(PARALLAX_LEVELS.treesLarge, 2) },
      { translateX: -targetX },
      { translateY: -targetZ },
    ]);
    const scaleOf = (level: keyof typeof PARALLAX_LEVELS) =>
      (result.current.levels[level].value[2] as { scale: number }).scale;
    expect(scaleOf('bushes')).toBeLessThan(scaleOf('signs'));
    expect(scaleOf('signs')).toBeLessThan(scaleOf('treesSmall'));
    expect(scaleOf('treesSmall')).toBeLessThan(scaleOf('treesLarge'));
  });

  it('sin paralaje las capas no se mueven', async () => {
    const { result } = await renderView({ parallax: 0 });
    expect((result.current.levels.treesLarge.value[2] as { scale: number }).scale).toBe(1);
  });
});
