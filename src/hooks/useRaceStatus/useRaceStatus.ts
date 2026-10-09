import { useEffect, useState } from 'react';

import { getFinishResults } from '@/core/RaceFlow';
import type { RaceLapView, RacePhase, RaceResults } from '@/core/RaceFlow';

import type { UseRaceStatusParams, UseRaceStatusResult } from './useRaceStatus.types';

/** Espera entre la llegada y los resultados: se ve cruzar la meta y frenar. */
export const RESULTS_DELAY_MS = 1500;

/**
 * Lo que la pantalla de carrera necesita saber para mostrar sus capas: el estado
 * (para la pausa), la vuelta al pausar y los resultados después de la llegada.
 * Sigue los eventos del bus, en el hilo de JS; no lee la carrera en cada cuadro.
 */
export function useRaceStatus({
  bus,
  lapView,
  resultsDelayMs = RESULTS_DELAY_MS,
}: UseRaceStatusParams): UseRaceStatusResult {
  const [phase, setPhase] = useState<RacePhase>('grid');
  const [pausedLap, setPausedLap] = useState<RaceLapView | null>(null);
  // Resultados de la llegada que esperan su momento.
  const [pending, setPending] = useState<RaceResults | null>(null);
  const [results, setResults] = useState<RaceResults | null>(null);

  useEffect(() => {
    const offPhase = bus.on('phase', (event) => {
      setPhase(event.to);
      // La carrera está congelada: una lectura alcanza para toda la pausa.
      setPausedLap(event.to === 'paused' ? lapView.get() : null);
      if (event.to === 'grid') {
        setPending(null);
        setResults(null);
      }
    });
    const offFinish = bus.on('finish', (event) => setPending(getFinishResults(event)));
    return () => {
      offPhase();
      offFinish();
    };
  }, [bus, lapView]);

  useEffect(() => {
    if (pending === null) {
      return undefined;
    }
    const timer = setTimeout(() => setResults(pending), resultsDelayMs);
    return () => clearTimeout(timer);
  }, [pending, resultsDelayMs]);

  return { phase, pausedLap, results };
}
