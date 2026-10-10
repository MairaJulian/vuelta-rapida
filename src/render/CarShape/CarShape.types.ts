import type { Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

export interface CarShapeProps {
  /**
   * Posición y rumbo del auto: en la carrera, un valor compartido que cambia cada
   * cuadro; en un menú, una transformación fija.
   */
  transform: SharedValue<Transforms3d> | Transforms3d;
  /** Color de la carrocería, la trompa y el alerón delantero. Por defecto, el azul. */
  bodyColor?: string;
  /** Número del auto, sobre el disco blanco. Sin número, el disco queda vacío. */
  number?: number | null;
}
