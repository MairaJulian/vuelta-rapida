import type { Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

export interface CarShapeProps {
  /**
   * Posición y rumbo del auto: en la carrera, un valor compartido que cambia cada
   * cuadro; en un menú, una transformación fija.
   */
  transform: SharedValue<Transforms3d> | Transforms3d;
  /** Color de la carrocería. Por defecto, el azul del jugador. */
  bodyColor?: string;
}
