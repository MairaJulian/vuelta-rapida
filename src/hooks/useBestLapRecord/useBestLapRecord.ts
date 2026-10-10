import { useCallback } from 'react';

import { ticksToMs } from '@/core/LapTimer';
import { getBestLap, withLapRecord } from '@/core/Profiles';
import { updateProfiles, useProfiles } from '@/hooks/useProfiles';

import type { UseBestLapRecordParams, UseBestLapRecordResult } from './useBestLapRecord.types';

/**
 * Récord de un circuito del perfil activo: lo lee de los perfiles y guarda una vuelta
 * nueva si es más rápida. Corre en el hilo de JS; el loop le avisa con `scheduleOnRN`
 * cuando mejora la mejor vuelta de la sesión. Sin perfil activo, el récord queda sin
 * dueño y pasa al primer perfil que se cree.
 */
export function useBestLapRecord({
  circuitId,
  stepHz,
}: UseBestLapRecordParams): UseBestLapRecordResult {
  const { state } = useProfiles();
  const recordMs = getBestLap(state, state.activeProfileId, circuitId);

  const saveLap = useCallback(
    (lapTicks: number) => {
      // Compara con los récords del momento, no con los del último render.
      updateProfiles(
        (current) =>
          withLapRecord(
            current,
            current.activeProfileId,
            circuitId,
            ticksToMs(lapTicks, stepHz),
            Date.now(),
          ) ?? current,
      );
    },
    [circuitId, stepHz],
  );

  return { recordMs, saveLap };
}
