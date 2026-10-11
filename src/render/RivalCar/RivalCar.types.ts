import type { SharedValue } from 'react-native-reanimated';

import type { CameraView } from '@/core/Camera';
import type { CarState } from '@/core/DrivingModel';

export interface RivalCarProps {
  /** Autos rivales a dibujar, en el orden de la grilla (`rivalCars` de `useRaceLoop`). */
  cars: SharedValue<CarState[]>;
  /** Qué rival es este: su posición en `cars`. */
  index: number;
  /** Cámara actual, para dejar el nombre derecho en la pantalla (`cameraView` de `useRaceLoop`). */
  cameraView: SharedValue<CameraView>;
  /** Color de la carrocería (de `getCarColor`). */
  color: string;
  /** Nombre del rival, ya en mayúsculas. */
  name: string;
}
