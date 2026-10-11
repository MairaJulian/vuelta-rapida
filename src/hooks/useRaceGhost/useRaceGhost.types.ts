import type { Transforms3d } from '@shopify/react-native-skia';
import type { DerivedValue, SharedValue } from 'react-native-reanimated';

import type { CameraView } from '@/core/Camera';
import type { EventBus } from '@/core/EventBus';
import type { RaceEvent, RaceState } from '@/core/RaceFlow';
import type { Circuit } from '@/core/Track';

export interface UseRaceGhostParams {
  /** El bus de la carrera: al volver a la grilla se vuelve a elegir el fantasma. */
  bus: EventBus<RaceEvent>;
  /** Circuito de la carrera. */
  circuit: Circuit;
  /** Estado de la carrera (de `useRaceLoop`). */
  race: SharedValue<RaceState>;
  /** Lo que muestra la cámara (de `useRaceLoop`): su giro mantiene derecho el nombre. */
  cameraView: DerivedValue<CameraView>;
}

/** El fantasma a dibujar: de quién es y dónde está cada cuadro. */
export interface RaceGhostView {
  /** Nombre del dueño, en mayúsculas, como en el resto del juego. */
  name: string;
  /** Color del auto del dueño (hex). */
  color: string;
  /** Posición y rumbo del fantasma en el mundo. */
  transform: DerivedValue<Transforms3d>;
  /** Posición del nombre: sobre el fantasma y derecho en la pantalla, gire como gire la cámara. */
  labelTransform: DerivedValue<Transforms3d>;
  /** 0 cuando no hay que dibujarlo (tras la llegada); si no, el de un auto translúcido. */
  opacity: DerivedValue<number>;
}

export interface UseRaceGhostResult {
  /** El fantasma a dibujar; `null` si no hay (sin fantasma elegido o sin grabación todavía). */
  ghost: RaceGhostView | null;
  /**
   * Diferencia con el fantasma, en segundos: positiva si el jugador va atrás. `null`
   * fuera de la carrera o sin fantasma.
   */
  delta: DerivedValue<number | null>;
}
