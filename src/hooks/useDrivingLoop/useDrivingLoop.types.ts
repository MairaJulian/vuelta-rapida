import type { Transforms3d } from '@shopify/react-native-skia';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';

import type { CameraConfig, Viewport } from '@/core/Camera';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import type { LapState } from '@/core/LapTimer';
import type { Circuit } from '@/core/Track';

export interface UseDrivingLoopParams {
  /** Entrada que escribe el modo de control. */
  input: SharedValue<DrivingInput>;
  /** Circuito: la largada, los límites de pista y las vueltas. El ancho se puede cambiar en caliente. */
  track: Circuit;
  /** Tamaño del área de dibujo, en dp. */
  viewport: Viewport;
  /** Parámetros del modelo de manejo. Se pueden cambiar en caliente. */
  drivingConfig: DrivingConfig;
  /** Parámetros de la cámara. Se pueden cambiar en caliente. */
  cameraConfig: CameraConfig;
  /**
   * Se llama en el hilo de JS cuando mejora la mejor vuelta de la sesión, con su
   * duración en pasos. Tiene que ser estable (por ejemplo, de `useBestLapRecord`).
   */
  onBestLap?: (bestLapTicks: number) => void;
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
  /** Vueltas y tiempos de la sesión, en pasos de simulación. */
  laps: DerivedValue<LapState>;
  /** Vuelve el auto a la largada, detenido, con las vueltas sin empezar. */
  reset: () => void;
}
