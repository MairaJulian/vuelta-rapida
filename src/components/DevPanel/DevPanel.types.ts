import type { SharedValue } from 'react-native-reanimated';

import type { CameraConfig } from '@/core/Camera';
import type { CarState, DrivingConfig } from '@/core/DrivingModel';
import type { ControlMode } from '@/core/PlayerPreferences';
import type { TiltConfig, TiltSteeringResult } from '@/core/TiltSteering';
import type { TrackData } from '@/core/Track';

export interface DevPanelProps {
  drivingConfig: DrivingConfig;
  onDrivingConfigChange: (config: DrivingConfig) => void;
  cameraConfig: CameraConfig;
  onCameraConfigChange: (config: CameraConfig) => void;
  /** Pista en uso; el panel solo cambia su ancho. */
  track: TrackData;
  onTrackChange: (track: TrackData) => void;
  /** Modo de control en uso; se cambia en caliente. */
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  /** Configuración efectiva de la inclinación (con la calibración y la sensibilidad del jugador). */
  tiltConfig: TiltConfig;
  /** Recibe la configuración entera; la pantalla decide qué se guarda como preferencia. */
  onTiltConfigChange: (config: TiltConfig) => void;
  /** Resultado de la inclinación en cada cuadro, para las lecturas. */
  tiltOutput: SharedValue<TiltSteeringResult>;
  /** Toma la posición actual del celular como "derecho" y la guarda. */
  onRecalibrate: () => void;
  /** Abre la pantalla de calibración completa. */
  onOpenCalibration: () => void;
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

/** Lecturas de la inclinación ya formateadas. */
export interface TiltReadings {
  /** Ángulo leído, ya calibrado, en grados con signo. */
  angle: string;
  /** Dirección resultante, de -1 a 1. */
  steer: string;
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

/** Parámetros numéricos de la cámara (`rotateWithCar` va en un interruptor). */
export type NumericCameraKey = Exclude<keyof CameraConfig, 'rotateWithCar'>;

/** Parámetros de la pista que se ajustan en el panel (el trazado no). */
export type TrackSliderKey = 'width';

/** Parámetros de la inclinación con slider. La calibración va con su propio botón. */
export type TiltSliderKey = Exclude<keyof TiltConfig, 'neutralAngle'>;
