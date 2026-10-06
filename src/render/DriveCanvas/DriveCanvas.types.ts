import type { Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { TrackData } from '@/core/Track';

export interface DriveCanvasProps {
  /** Circuito a dibujar. */
  track: TrackData;
  /** Transformación de la cámara (de `useDrivingLoop`). */
  cameraTransform: SharedValue<Transforms3d>;
  /** Posición y rumbo del auto en el mundo (de `useDrivingLoop`). */
  carTransform: SharedValue<Transforms3d>;
}
