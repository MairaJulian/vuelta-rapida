import { useCallback } from 'react';

import { ticksToMs } from '@/core/LapTimer';
import { withBestLap } from '@/core/PlayerPreferences';
import {
  readPlayerPreferences,
  updatePlayerPreferences,
  usePlayerPreferences,
} from '@/hooks/usePlayerPreferences';

import type { UseBestLapRecordParams, UseBestLapRecordResult } from './useBestLapRecord.types';

/**
 * Récord de un circuito: lo lee de las preferencias y guarda una vuelta nueva si
 * es más rápida. Corre en el hilo de JS; el loop le avisa con `scheduleOnRN` cuando
 * mejora la mejor vuelta de la sesión.
 */
export function useBestLapRecord({
  circuitId,
  stepHz,
}: UseBestLapRecordParams): UseBestLapRecordResult {
  const { preferences } = usePlayerPreferences();
  const recordMs = preferences.bestLapsMs[circuitId] ?? null;

  const saveLap = useCallback(
    (lapTicks: number) => {
      // Lee las preferencias del momento, no las del último render.
      const records = withBestLap(
        readPlayerPreferences().bestLapsMs,
        circuitId,
        ticksToMs(lapTicks, stepHz),
      );
      if (records) {
        updatePlayerPreferences({ bestLapsMs: records });
      }
    },
    [circuitId, stepHz],
  );

  return { recordMs, saveLap };
}
