import type { SharedValue } from 'react-native-reanimated';

import type { CameraConfig } from '@/core/Camera';
import type { CarState, DrivingConfig } from '@/core/DrivingModel';
import type { TrackData } from '@/core/Track';

export interface DevPanelProps {
  drivingConfig: DrivingConfig;
  onDrivingConfigChange: (config: DrivingConfig) => void;
  cameraConfig: CameraConfig;
  onCameraConfigChange: (config: CameraConfig) => void;
  /** Pista en uso; el panel solo cambia su ancho. */
  track: TrackData;
  onTrackChange: (track: TrackData) => void;
  /** Estado del auto, para las lecturas. */
  car: SharedValue<CarState>;
  /** fps suavizados, para las lecturas. */
  fps: SharedValue<number>;
  /** Vuelve el auto a la largada. */
  onResetCar: () => void;
}

/** Lecturas ya formateadas para mostrar. */
export interface DevReadings {
  speed: string;
  heading: string;
  drift: string;
  fps: string;
}

/** Definición de un slider: qué parámetro mueve y con qué rango. */
export interface SliderSpec<Key extends string> {
  key: Key;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

/** Parámetros numéricos de la cámara (sin `rotateWithCar`, que se prueba en el hito 3). */
export type NumericCameraKey = Exclude<keyof CameraConfig, 'rotateWithCar'>;

/** Parámetros de la pista que se ajustan en el panel (el trazado no). */
export type TrackSliderKey = 'width';
