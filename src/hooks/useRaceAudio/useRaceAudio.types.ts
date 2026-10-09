import type { RaceAudio, RaceAudioMix } from '@/audio/RaceAudio';
import type { EventBus } from '@/core/EventBus';
import type { RaceEvent } from '@/core/RaceFlow';

export interface UseRaceAudioParams {
  /** Bus de la carrera: los efectos y la pausa del sonido siguen sus eventos. */
  bus: EventBus<RaceEvent>;
  /** Preferencia del jugador: sin sonido, todo queda en silencio. */
  enabled: boolean;
  /** Volúmenes y tono del motor. Se pueden cambiar en caliente. */
  mix: RaceAudioMix;
  /** Crea el sonido. Por defecto, con los WAV empaquetados; los tests pasan uno falso. */
  createAudio?: () => RaceAudio;
}

export interface UseRaceAudioResult {
  /** Para `useRaceLoop` (`onEngine`): la velocidad del auto, de 0 a 1. Estable. */
  onEngine: (speedRatio: number) => void;
}
