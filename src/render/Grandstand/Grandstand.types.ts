import type { SceneryObject } from '@/core/Scenery';

export interface GrandstandProps {
  /** La tribuna de la escenografía (`kind: 'grandstand'`). */
  stand: SceneryObject;
  /**
   * Qué parte dibujar: las gradas con el público (a la altura de los carteles) o el
   * techo (más alto: con el paralaje se corre más que las gradas).
   */
  part: 'stands' | 'roof';
}
