import type { Transforms3d } from '@shopify/react-native-skia';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';

import type { CameraConfig, Viewport } from '@/core/Camera';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import type { TrackData } from '@/core/Track';

export interface UseDrivingLoopParams {
  /** Entrada que escribe el modo de control. */
  input: SharedValue<DrivingInput>;
  /** Circuito; define la largada. */
  track: TrackData;
  /** Tamaño del área de dibujo, en dp. */
  viewport: Viewport;
  /** Parámetros del modelo de manejo. Se pueden cambiar en caliente. */
  drivingConfig: DrivingConfig;
  /** Parámetros de la cámara. Se pueden cambiar en caliente. */
  cameraConfig: CameraConfig;
}

export interface UseDrivingLoopResult {
  /** Estado del auto a dibujar (interpolado), actualizado cada cuadro. */
  car: SharedValue<CarState>;
  /** fps suavizados de la pantalla. */
  fps: SharedValue<number>;
  /** Transformación de la cámara para el grupo del mundo en Skia. */
  cameraTransform: DerivedValue<Transforms3d>;
  /** Transformación del auto (posición y rumbo) en coordenadas del mundo. */
  carTransform: DerivedValue<Transforms3d>;
  /** Vuelve el auto a la largada, detenido. */
  reset: () => void;
}
