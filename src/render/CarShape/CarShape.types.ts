import type { Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

export interface CarShapeProps {
  /** Posición y rumbo del auto en el mundo, actualizados cada cuadro. */
  transform: SharedValue<Transforms3d>;
  /** Color de la carrocería. Por defecto, el azul del jugador. */
  bodyColor?: string;
}
