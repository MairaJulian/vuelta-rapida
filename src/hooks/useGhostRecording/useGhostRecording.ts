import { useEffect } from 'react';

import { encodeGhost } from '@/core/Ghost';
import { ticksToMs } from '@/core/LapTimer';
import { withGhost } from '@/core/Profiles';
import { updateProfiles } from '@/hooks/useProfiles';

import type { UseGhostRecordingParams } from './useGhostRecording.types';

/**
 * Guarda como fantasma del perfil activo la vuelta que mejora su récord. La carrera
 * graba cada vuelta y avisa con `recordTrace` solo cuando es récord (junto con
 * `newRecord`, que guarda el tiempo en `useBestLapRecord`); acá se codifica y se
 * guarda. Un fantasma por perfil y pista: solo reemplaza a uno más lento. Sin perfil
 * activo no se guarda nada. Corre en el hilo de JS.
 */
export function useGhostRecording({ bus, circuitId, stepHz }: UseGhostRecordingParams): void {
  useEffect(
    () =>
      bus.on('recordTrace', (event) => {
        const recording = encodeGhost(
          event.samples,
          event.sampleHz,
          ticksToMs(event.lapTicks, stepHz),
        );
        if (recording) {
          // Compara con los datos del momento, no con los del último render.
          updateProfiles(
            (state) =>
              withGhost(state, state.activeProfileId, circuitId, recording, Date.now()) ?? state,
          );
        }
      }),
    [bus, circuitId, stepHz],
  );
}
