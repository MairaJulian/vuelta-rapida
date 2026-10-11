import type { Transforms3d } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { getCarColor } from '@/core/CarPalette';
import { createGhostPlayback, getGhostGap, getGhostPose, getLapProgress } from '@/core/Ghost';
import type { GhostPlayback } from '@/core/Ghost';
import { resolveGhost } from '@/core/GhostChoice';
import type { ResolvedGhost } from '@/core/GhostChoice';
import { getRaceLapClockMs, getRaceLapView } from '@/core/RaceFlow';
import { readPlayerPreferences } from '@/hooks/usePlayerPreferences';
import { readProfiles } from '@/hooks/useProfiles';

import { GHOST_LABEL_OFFSET, GHOST_OPACITY } from './useRaceGhost.constants';
import type { RaceGhostView, UseRaceGhostParams, UseRaceGhostResult } from './useRaceGhost.types';

const HIDDEN: Transforms3d = [{ translateX: 0 }, { translateY: 0 }];

/** El fantasma elegido en las preferencias, con los datos de este momento. */
function chooseGhost(circuitId: string): ResolvedGhost | null {
  const profiles = readProfiles();
  return resolveGhost(
    profiles,
    readPlayerPreferences().ghostSource,
    profiles.activeProfileId,
    circuitId,
  );
}

/** Si dos elecciones son el mismo fantasma (misma grabación, mismo nombre y color). */
function sameGhost(a: ResolvedGhost | null, b: ResolvedGhost | null): boolean {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.recording === b.recording &&
      a.profile.name === b.profile.name &&
      a.profile.colorId === b.profile.colorId)
  );
}

/**
 * El auto fantasma de la carrera: lo elige según las preferencias, lo reproduce con el
 * reloj de la vuelta (reinicia en cada cruce de meta) y calcula la diferencia con el
 * jugador. Todo lo que cambia por cuadro corre en el hilo de UI.
 *
 * El fantasma se elige al abrir la carrera y cada vez que se vuelve a la grilla: una
 * vuelta récord grabada en plena carrera no lo cambia a mitad de camino.
 */
export function useRaceGhost({
  bus,
  circuit,
  race,
  cameraView,
}: UseRaceGhostParams): UseRaceGhostResult {
  const circuitId = circuit.id;
  const [resolved, setResolved] = useState(() => chooseGhost(circuitId));
  useEffect(() => {
    const refresh = () =>
      setResolved((current) => {
        const next = chooseGhost(circuitId);
        return sameGhost(current, next) ? current : next;
      });
    refresh();
    return bus.on('phase', (event) => {
      if (event.to === 'grid') {
        refresh();
      }
    });
  }, [bus, circuitId]);

  // Decodificar y medir el progreso recorre la grabación entera: una vez por fantasma.
  // El ancho de la pista (panel de desarrollo) no cambia el trazado: no hace falta rehacerlo.
  const { centerline, distances, length } = circuit;
  const playback = useMemo<GhostPlayback | null>(
    () => (resolved ? createGhostPlayback(resolved.recording, circuit) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolved, centerline, distances, length],
  );
  const playbackValue = useSharedValue<GhostPlayback | null>(playback);
  const lapLength = useSharedValue(length);
  useEffect(() => playbackValue.set(playback), [playbackValue, playback]);
  useEffect(() => lapLength.set(length), [lapLength, length]);

  const transform = useDerivedValue<Transforms3d>(() => {
    const data = playbackValue.get();
    if (!data) {
      return HIDDEN;
    }
    const pose = getGhostPose(data, getRaceLapClockMs(race.get()));
    return [{ translateX: pose.x }, { translateY: pose.z }, { rotate: pose.heading }];
  });

  const labelTransform = useDerivedValue<Transforms3d>(() => {
    const data = playbackValue.get();
    if (!data) {
      return HIDDEN;
    }
    const pose = getGhostPose(data, getRaceLapClockMs(race.get()));
    return [
      { translateX: pose.x },
      { translateY: pose.z },
      // Contra el giro de la cámara, para que el nombre quede derecho en la pantalla.
      { rotate: cameraView.get().rotation },
      { translateY: -GHOST_LABEL_OFFSET },
    ];
  });

  const opacity = useDerivedValue<number>(() =>
    race.get().phase === 'finished' ? 0 : GHOST_OPACITY,
  );

  const delta = useDerivedValue<number | null>(() => {
    const data = playbackValue.get();
    const current = race.get();
    if (!data || current.phase !== 'racing') {
      return null;
    }
    const lapMs = (getRaceLapView(current).lapTicks * 1000) / current.stepHz;
    return getGhostGap(data, lapMs, getLapProgress(current.sim.laps, lapLength.get()));
  });

  const ghost = useMemo<RaceGhostView | null>(
    () =>
      resolved && playback
        ? {
            name: resolved.profile.name.toUpperCase(),
            color: getCarColor(resolved.profile.colorId).hex,
            transform,
            labelTransform,
            opacity,
          }
        : null,
    [resolved, playback, transform, labelTransform, opacity],
  );

  return { ghost, delta };
}
