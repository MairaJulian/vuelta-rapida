import type { SkRect, SkRSXform, Transforms3d } from '@shopify/react-native-skia';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';

import type { CameraView, Viewport } from '@/core/Camera';
import type { Scenery } from '@/core/Scenery';
import type { PARALLAX_LEVELS, SpriteLayerId } from '@/core/SceneryView';

/** Capas con paralaje: cada una se dibuja con una sola transformación. */
export type ParallaxLevelId = keyof typeof PARALLAX_LEVELS;

export interface UseSceneryViewParams {
  /** Escenografía del circuito; sin ella no hay nada que dibujar. */
  scenery: Scenery | undefined;
  /** Lo que muestra la cámara (de `useRaceLoop`). */
  cameraView: SharedValue<CameraView> | DerivedValue<CameraView>;
  /** Tamaño del área de dibujo, en dp. */
  viewport: Viewport;
  /** Intensidad del paralaje: 0 lo apaga, 1 es lo normal. Se puede cambiar en caliente. */
  parallax: number;
}

/** Lo que dibuja un `Atlas` de Skia: recortes de la textura y su transformación al mundo. */
export interface AtlasSprites {
  sprites: SharedValue<SkRect[]>;
  transforms: SharedValue<SkRSXform[]>;
}

export interface UseSceneryViewResult {
  /** Dibujos visibles de cada capa del atlas (sombras, arbustos, árboles chicos y grandes). */
  atlas: Record<SpriteLayerId, AtlasSprites>;
  /**
   * Transformación de cada capa con paralaje, dentro del grupo de la cámara: escala la
   * capa alrededor del centro de la pantalla según su altura.
   */
  levels: Record<ParallaxLevelId, DerivedValue<Transforms3d>>;
}
