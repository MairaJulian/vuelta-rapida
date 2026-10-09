import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import {
  createRaceAudio,
  DEFAULT_RACE_AUDIO_MIX,
  getSoundCue,
  RACE_SOUND_SOURCES,
} from '@/audio/RaceAudio';
import type { RaceAudio } from '@/audio/RaceAudio';

import type { UseRaceAudioParams, UseRaceAudioResult } from './useRaceAudio.types';

const defaultCreateAudio = () =>
  createRaceAudio({ sources: RACE_SOUND_SOURCES, mix: DEFAULT_RACE_AUDIO_MIX });

/**
 * El sonido de la pantalla de carrera: lo crea al montar y lo cierra al salir,
 * hace sonar los efectos de cada evento, congela el audio en la pausa y en segundo
 * plano, y respeta la preferencia de sonido. Devuelve `onEngine` para el loop.
 */
export function useRaceAudio({
  bus,
  enabled,
  mix,
  createAudio = defaultCreateAudio,
}: UseRaceAudioParams): UseRaceAudioResult {
  const audioRef = useRef<RaceAudio | null>(null);
  // La pausa de la carrera, para no reanudar el audio al volver del segundo plano.
  const pausedRef = useRef(false);

  // Primero se crea; los efectos de abajo aplican la preferencia y la mezcla.
  useEffect(() => {
    const audio = createAudio();
    audioRef.current = audio;
    audio.load().catch(() => undefined);
    return () => {
      audioRef.current = null;
      audio.close();
    };
  }, [createAudio]);

  useEffect(() => audioRef.current?.setMuted(!enabled), [createAudio, enabled]);
  useEffect(() => audioRef.current?.setMix(mix), [createAudio, mix]);

  useEffect(
    () =>
      bus.onAny((event) => {
        const audio = audioRef.current;
        if (!audio) {
          return;
        }
        if (event.type === 'phase') {
          if (event.to === 'paused') {
            pausedRef.current = true;
            audio.suspend();
          } else if (event.from === 'paused') {
            pausedRef.current = false;
            audio.resume();
          }
          return;
        }
        const cue = getSoundCue(event);
        if (cue) {
          audio.play(cue);
        }
      }),
    [bus],
  );

  // En segundo plano no suena nada, tampoco en los resultados (que no se pausan).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const audio = audioRef.current;
      if (state !== 'active') {
        audio?.suspend();
      } else if (!pausedRef.current) {
        audio?.resume();
      }
    });
    return () => subscription.remove();
  }, []);

  const onEngine = useCallback((speedRatio: number) => {
    audioRef.current?.setEngineSpeed(speedRatio);
  }, []);

  return { onEngine };
}
