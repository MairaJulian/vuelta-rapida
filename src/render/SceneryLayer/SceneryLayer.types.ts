import type { SkImage } from '@shopify/react-native-skia';

import type { Scenery } from '@/core/Scenery';
import type { UseSceneryViewResult } from '@/hooks/useSceneryView';

export interface SceneryLayerProps {
  /** Escenografía del circuito. */
  scenery: Scenery;
  /** Textura de árboles, sombras y neumáticos (`useSceneryAtlas`); sin ella no se dibujan. */
  atlas: SkImage | null;
  /** Árboles visibles y transformaciones del paralaje (`useSceneryView`). */
  view: UseSceneryViewResult;
  /**
   * Qué capas dibujar:
   * - `ground`: lo que está en el suelo (sombras y barreras de neumáticos), debajo de
   *   los autos.
   * - `raised`: lo que tiene altura (arbustos, carteles, tribuna, árboles), encima de
   *   los autos y con paralaje.
   */
  level: 'ground' | 'raised';
}
