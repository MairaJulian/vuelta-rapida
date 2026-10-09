import type { SkFont } from '@shopify/react-native-skia';

import type { SceneryObject } from '@/core/Scenery';

export interface SceneryBoardProps {
  /** Un cartel de distancia (`distanceBoard`) o publicitario (`billboard`) de la escenografía. */
  board: SceneryObject;
  /** Fuente de 1 m (`FONT_SIZE`), compartida por todos los carteles. */
  font: SkFont;
}
