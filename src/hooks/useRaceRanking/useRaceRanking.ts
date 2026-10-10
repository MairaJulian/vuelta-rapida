import { useEffect, useRef, useState } from 'react';

import { ticksToMs } from '@/core/LapTimer';
import type { ProfilesState } from '@/core/Profiles';
import { withRaceRecord } from '@/core/Profiles';
import { getRaceRanking } from '@/core/Ranking';
import type { RaceRanking } from '@/core/Ranking';
import { readProfiles, updateProfiles } from '@/hooks/useProfiles';

import type { UseRaceRankingParams, UseRaceRankingResult } from './useRaceRanking.types';

/**
 * El ranking de la pista con cada carrera del jugador activo. Sigue el bus:
 * - Al apagarse el semáforo, guarda una foto de los récords (el "antes").
 * - Al llegar, guarda el total de la carrera si mejora y compara el ranking de las
 *   dos tablas (mejor vuelta y carrera completa con esas vueltas).
 * - Al volver a la grilla (Otra vez), lo olvida.
 *
 * La mejor vuelta la guarda `useBestLapRecord` durante la carrera (evento `newRecord`,
 * que llega antes que la llegada), por eso el "antes" se toma al largar.
 */
export function useRaceRanking({
  bus,
  circuitId,
  stepHz,
}: UseRaceRankingParams): UseRaceRankingResult {
  const beforeRef = useRef<ProfilesState | null>(null);
  const [ranking, setRanking] = useState<RaceRanking | null>(null);

  useEffect(() => {
    const offStart = bus.on('lightsOut', () => {
      beforeRef.current = readProfiles();
    });
    const offPhase = bus.on('phase', (event) => {
      if (event.to === 'grid') {
        setRanking(null);
      }
    });
    const offFinish = bus.on('finish', (event) => {
      const before = beforeRef.current ?? readProfiles();
      const profileId = readProfiles().activeProfileId;
      if (profileId === null) {
        return;
      }
      const laps = event.lapTicks.length;
      const totalMs = ticksToMs(event.totalTicks, stepHz);
      updateProfiles(
        (state) => withRaceRecord(state, profileId, circuitId, laps, totalMs, Date.now()) ?? state,
      );
      setRanking(getRaceRanking(before, readProfiles(), profileId, circuitId, laps));
    });
    return () => {
      offStart();
      offPhase();
      offFinish();
    };
  }, [bus, circuitId, stepHz]);

  return { ranking };
}
