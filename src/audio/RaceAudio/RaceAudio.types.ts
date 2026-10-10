import type { AudioContext } from 'react-native-audio-api';

import type { GearboxConfig, GearboxPace } from '@/audio/EngineGears';

/** Efectos de la carrera. El motor va aparte: suena en loop. */
export type RaceSound = 'light' | 'go' | 'kerb' | 'border' | 'lap' | 'finish';

/** Archivos de sonido: lo que devuelve `require` de cada WAV (o una URL en los tests). */
export type RaceSoundSources = Record<RaceSound | 'engine', number | string>;

/** Un efecto a sonar, con su volumen relativo de 0 a 1. */
export interface RaceSoundCue {
  sound: RaceSound;
  volume: number;
}

/** Mezcla del sonido. Se ajusta en el panel de desarrollo; vale solo para la sesión. */
export interface RaceAudioMix {
  /** Volumen del motor, de 0 a 1. */
  engineVolume: number;
  /** Volumen de los efectos, de 0 a 1. */
  effectsVolume: number;
  /** Tono del motor con el auto detenido: velocidad de reproducción del loop (1 = original). */
  enginePitchMin: number;
  /**
   * Tono del motor en el corte (con cambios de marcha) o a la velocidad máxima (sin
   * cambios).
   */
  enginePitchMax: number;
  /**
   * Si el motor hace los cambios de marcha: el tono sube en cada marcha y cae al pasar a
   * la siguiente. Sin cambios, el tono sigue a la velocidad, de detenido a máxima.
   */
  gearShifts: boolean;
  /** Ritmo de los cambios: cuándo llega a sexta acelerando desde 0 (`audio/EngineGears`). */
  gearPace: GearboxPace;
}

/** Ajustes numéricos de la mezcla: los que se mueven con un slider en el panel. */
export type RaceAudioMixLevel = Exclude<keyof RaceAudioMix, 'gearShifts' | 'gearPace'>;

export interface RaceAudioOptions {
  sources: RaceSoundSources;
  mix: RaceAudioMix;
  /** Marchas del motor. Por defecto, las del ritmo de la mezcla (`gearPace`). */
  gearbox?: GearboxConfig;
  /** Crea el contexto de audio. Por defecto, uno nuevo; los tests pasan el suyo. */
  createContext?: () => AudioContext;
}

/**
 * Sonido de una carrera. Todas las órdenes son seguras: antes de cargar, o después
 * de cerrar, no hacen nada. Los errores del audio no llegan al juego.
 */
export interface RaceAudio {
  /** Decodifica los sonidos y arranca el motor en ralentí. */
  load(): Promise<void>;
  /**
   * Velocidad del auto, de 0 (detenido) a 1 (máxima): volumen del motor y, con los
   * cambios de marcha, la marcha y las revoluciones que dan el tono.
   */
  setEngineSpeed(ratio: number): void;
  /** Suena un efecto. */
  play(cue: RaceSoundCue): void;
  setMix(mix: RaceAudioMix): void;
  /** Silencia todo (motor y efectos) sin detener nada. */
  setMuted(muted: boolean): void;
  /** Congela el audio (pausa de la carrera). */
  suspend(): void;
  resume(): void;
  /** Libera el audio. Después no suena nada más. */
  close(): void;
}
