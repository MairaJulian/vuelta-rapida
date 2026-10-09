import { Skia } from '@shopify/react-native-skia';
import type { SkRect, SkRSXform, Transforms3d } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';

import type { CameraView } from '@/core/Camera';
import {
  buildSpriteLayers,
  getItemsInRange,
  getParallaxScale,
  getVisibleCellRange,
  isSameCellRange,
  PARALLAX_LEVELS,
  SCENERY_CELL_SIZE,
} from '@/core/SceneryView';
import type { CellRange, SpriteLayer, SpriteLayerId } from '@/core/SceneryView';
import { SPRITE_LAYOUT } from '@/render/SceneryAtlas';

import type {
  AtlasSprites,
  UseSceneryViewParams,
  UseSceneryViewResult,
} from './useSceneryView.types';

type SpriteLayers = Record<SpriteLayerId, SpriteLayer>;

/** Recortes y transformaciones de los dibujos de una capa que caen en las celdas visibles. */
function pickVisible(
  layer: SpriteLayer,
  range: CellRange,
): { sprites: SkRect[]; transforms: SkRSXform[] } {
  'worklet';
  const indices = getItemsInRange(layer.grid, range);
  const sprites: SkRect[] = [];
  const transforms: SkRSXform[] = [];
  for (let i = 0; i < indices.length; i += 1) {
    const entry = layer.entries[indices[i]];
    sprites.push(Skia.XYWHRect(entry.frame.x, entry.frame.y, entry.frame.size, entry.frame.size));
    transforms.push(Skia.RSXform(entry.scos, entry.ssin, entry.tx, entry.ty));
  }
  return { sprites, transforms };
}

/** Recortes y transformaciones de una capa del atlas, vacíos al empezar. */
function useAtlasSprites(): AtlasSprites {
  const sprites = useSharedValue<SkRect[]>([]);
  const transforms = useSharedValue<SkRSXform[]>([]);
  return useMemo(() => ({ sprites, transforms }), [sprites, transforms]);
}

/** Capa con paralaje: escala alrededor del punto que la cámara pone en el centro de la pantalla. */
function useLevelTransform(
  cameraView: SharedValue<CameraView> | DerivedValue<CameraView>,
  parallax: SharedValue<number>,
  height: number,
): DerivedValue<Transforms3d> {
  return useDerivedValue<Transforms3d>(() => {
    const view = cameraView.get();
    const scale = getParallaxScale(height, parallax.get());
    return [
      { translateX: view.targetX },
      { translateY: view.targetZ },
      { scale },
      { translateX: -view.targetX },
      { translateY: -view.targetZ },
    ];
  });
}

/**
 * Prepara la escenografía para dibujarla rápido: reparte los árboles y arbustos en
 * celdas y, en el hilo de UI, entrega al atlas solo los de las celdas que ve la
 * cámara. La lista se rearma únicamente cuando la cámara cambia de celdas (cada uno o
 * dos segundos a fondo); el resto de los cuadros no hace nada. Además da la
 * transformación de cada capa con paralaje. No dibuja nada.
 */
export function useSceneryView({
  scenery,
  cameraView,
  viewport,
  parallax,
}: UseSceneryViewParams): UseSceneryViewResult {
  const layers = useMemo<SpriteLayers | null>(
    () => (scenery ? buildSpriteLayers(scenery, SPRITE_LAYOUT, SCENERY_CELL_SIZE) : null),
    [scenery],
  );
  const layersValue = useSharedValue<SpriteLayers | null>(layers);
  const viewportValue = useSharedValue(viewport);
  const parallaxValue = useSharedValue(parallax);
  const lastRange = useSharedValue<CellRange | null>(null);

  const shadows = useAtlasSprites();
  const tyres = useAtlasSprites();
  const bushes = useAtlasSprites();
  const treesSmall = useAtlasSprites();
  const treesLarge = useAtlasSprites();

  useEffect(() => {
    layersValue.set(layers);
    // Con otra escenografía (densidad, ancho), el próximo cuadro rearma las listas.
    lastRange.set(null);
    if (!layers) {
      [shadows, tyres, bushes, treesSmall, treesLarge].forEach((atlas) => {
        atlas.sprites.set([]);
        atlas.transforms.set([]);
      });
    }
  }, [bushes, lastRange, layers, layersValue, shadows, treesLarge, treesSmall, tyres]);
  useEffect(() => viewportValue.set(viewport), [viewportValue, viewport]);
  useEffect(() => parallaxValue.set(parallax), [parallaxValue, parallax]);

  useFrameCallback(() => {
    'worklet';
    const current = layersValue.get();
    if (current === null) {
      return;
    }
    const range = getVisibleCellRange(cameraView.get(), viewportValue.get(), SCENERY_CELL_SIZE);
    if (isSameCellRange(lastRange.get(), range)) {
      return;
    }
    lastRange.set(range);
    const pairs: [SpriteLayer, AtlasSprites][] = [
      [current.shadows, shadows],
      [current.tyres, tyres],
      [current.bushes, bushes],
      [current.treesSmall, treesSmall],
      [current.treesLarge, treesLarge],
    ];
    for (let i = 0; i < pairs.length; i += 1) {
      const visible = pickVisible(pairs[i][0], range);
      pairs[i][1].sprites.set(visible.sprites);
      pairs[i][1].transforms.set(visible.transforms);
    }
  });

  const bushesLevel = useLevelTransform(cameraView, parallaxValue, PARALLAX_LEVELS.bushes);
  const signsLevel = useLevelTransform(cameraView, parallaxValue, PARALLAX_LEVELS.signs);
  const treesSmallLevel = useLevelTransform(cameraView, parallaxValue, PARALLAX_LEVELS.treesSmall);
  const treesLargeLevel = useLevelTransform(cameraView, parallaxValue, PARALLAX_LEVELS.treesLarge);

  return {
    atlas: { shadows, tyres, bushes, treesSmall, treesLarge },
    levels: {
      bushes: bushesLevel,
      signs: signsLevel,
      treesSmall: treesSmallLevel,
      treesLarge: treesLargeLevel,
    },
  };
}
