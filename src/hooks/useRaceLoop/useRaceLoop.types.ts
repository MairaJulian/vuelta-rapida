import type { Transforms3d } from '@shopify/react-native-skia';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';

import type { CameraConfig, Viewport } from '@/core/Camera';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import type { RaceConfig, RaceEvent, RaceLapView, RaceState } from '@/core/RaceFlow';
import type { Circuit } from '@/core/Track';

export interface UseRaceLoopParams {
  /** Entrada que escribe el modo de control. */
  input: SharedValue<DrivingInput>;
  /** Circuito: la largada, los límites de pista, los pianos y las vueltas. El ancho se puede cambiar en caliente. */
  track: Circuit;
  /** Tamaño del área de dibujo, en dp. */
  viewport: Viewport;
  /** Parámetros del modelo de manejo. Se pueden cambiar en caliente. */
  drivingConfig: DrivingConfig;
  /** Parámetros de la cámara. Se pueden cambiar en caliente. */
  cameraConfig: CameraConfig;
  /** Reglas de la carrera. Valen desde la próxima carrera (`restart`). */
  raceConfig: RaceConfig;
  /** Récord del circuito, en pasos; `null` sin récord. Vale desde la próxima carrera. */
  recordTicks: number | null;
  /**
   * Eventos de la carrera, en el hilo de JS y en orden, solo en los cuadros que
   * tienen alguno. Tiene que ser estable (por ejemplo, `bus.emitAll`).
   */
  onEvents?: (events: RaceEvent[]) => void;
  /**
   * Muestra de la velocidad para el sonido del motor, en el hilo de JS, unas 20
   * veces por segundo: de 0 (detenido) a 1 (velocidad máxima). Tiene que ser estable.
   */
  onEngine?: (speedRatio: number) => void;
  /** Semilla de cada carrera nueva. Por defecto, la hora; los tests pasan una fija. */
  createSeed?: () => number;
}

export interface UseRaceLoopResult {
  /** Estado completo de la carrera (hilo de UI). */
  race: SharedValue<RaceState>;
  /** Estado del auto a dibujar (interpolado), actualizado cada cuadro. */
  car: SharedValue<CarState>;
  /** fps suavizados de la pantalla. */
  fps: SharedValue<number>;
  /** Transformación de la cámara para el grupo del mundo en Skia. */
  cameraTransform: DerivedValue<Transforms3d>;
  /** Transformación del auto (posición y rumbo) en coordenadas del mundo. */
  carTransform: DerivedValue<Transforms3d>;
  /** Vuelta en curso, total de vueltas y tiempo de la vuelta, para el HUD. */
  lapView: DerivedValue<RaceLapView>;
  /** Empieza el semáforo (solo desde la grilla). */
  startLights: () => void;
  /** Pausa la carrera (grilla, semáforo o carrera). */
  pause: () => void;
  /** Sale de la pausa. */
  resume: () => void;
  /** Carrera nueva en la grilla, con las reglas y el récord actuales. */
  restart: () => void;
}
