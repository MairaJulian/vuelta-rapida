import { useEffect, useRef } from 'react';

import { createRaceHaptics, getHapticLevel } from '@/haptics/RaceHaptics';
import type { RaceHaptics } from '@/haptics/RaceHaptics';

import type { UseRaceHapticsParams } from './useRaceHaptics.types';

const defaultCreateHaptics = () => createRaceHaptics();

/**
 * Las vibraciones de la pantalla de carrera: cada evento del bus vibra con la
 * intensidad de su momento (piano, borde, largada, llegada), si el jugador tiene
 * la vibración prendida. Al salir se cancela lo pendiente.
 */
export function useRaceHaptics({
  bus,
  enabled,
  config,
  createHaptics = defaultCreateHaptics,
}: UseRaceHapticsParams): void {
  const hapticsRef = useRef<RaceHaptics | null>(null);

  useEffect(() => {
    const haptics = createHaptics();
    hapticsRef.current = haptics;
    return () => {
      hapticsRef.current = null;
      haptics.close();
    };
  }, [createHaptics]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    return bus.onAny((event) => {
      const level = getHapticLevel(event, config);
      if (level) {
        hapticsRef.current?.pulse(level);
      }
    });
  }, [bus, config, enabled]);
}
