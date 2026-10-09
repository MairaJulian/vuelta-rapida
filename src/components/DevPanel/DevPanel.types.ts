import type { SharedValue } from 'react-native-reanimated';

import type { RaceAudioMix } from '@/audio/RaceAudio';
import type { CameraConfig } from '@/core/Camera';
import type { CarState, DrivingConfig } from '@/core/DrivingModel';
import type { ControlMode } from '@/core/PlayerPreferences';
import type { RaceConfig } from '@/core/RaceFlow';
import type { SceneryDisplayConfig } from '@/core/SceneryView';
import type { RaceHapticsConfig } from '@/haptics/RaceHaptics';
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
  /** Cómo se ve la escenografía: paralaje, franjas, partículas y si se dibuja (solo la sesión). */
  sceneryDisplay: SceneryDisplayConfig;
  onSceneryDisplayChange: (config: SceneryDisplayConfig) => void;
  /** Densidad de árboles y arbustos; cambiarla vuelve a generar la escenografía (misma semilla). */
  treeDensity: number;
  onTreeDensityChange: (density: number) => void;
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
  /** Reglas de la carrera; el panel solo cambia las vueltas, que valen desde la próxima carrera. */
  raceConfig: RaceConfig;
  onRaceConfigChange: (config: RaceConfig) => void;
  /** Volúmenes y tono del motor (solo la sesión). */
  audioMix: RaceAudioMix;
  onAudioMixChange: (mix: RaceAudioMix) => void;
  /** Intensidad de vibración de cada momento (solo la sesión). */
  hapticsConfig: RaceHapticsConfig;
  onHapticsConfigChange: (config: RaceHapticsConfig) => void;
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

/** Ajustes numéricos de la escenografía (los interruptores van aparte). */
export type SceneryDisplaySliderKey = 'parallax' | 'grassContrast';

/** Ajustes de la escenografía con interruptor. */
export type SceneryDisplaySwitchKey = 'visible' | 'particles';

/** Reglas de la carrera que se ajustan en el panel. */
export type RaceSliderKey = 'totalLaps';

/** Parámetros de la inclinación con slider. La calibración va con su propio botón. */
export type TiltSliderKey = Exclude<keyof TiltConfig, 'neutralAngle'>;
