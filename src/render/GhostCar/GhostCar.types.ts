import type { Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

export interface GhostCarProps {
  /** Posición y rumbo del fantasma en el mundo (de `useRaceGhost`). */
  transform: SharedValue<Transforms3d>;
  /** Posición del nombre, sobre el fantasma y derecho en la pantalla (de `useRaceGhost`). */
  labelTransform: SharedValue<Transforms3d>;
  /** Opacidad del conjunto: translúcido, o 0 para ocultarlo. */
  opacity: SharedValue<number>;
  /** Color de la carrocería: el del dueño. */
  color: string;
  /** Nombre del dueño, ya en mayúsculas. */
  name: string;
}
