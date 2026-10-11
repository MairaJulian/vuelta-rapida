import type { LapState } from '@/core/LapTimer';

import type { PositionEntry, Standing } from './RacePositions.types';

/**
 * Distancia de carrera de un auto: vueltas completas por el largo de la vuelta más el
 * progreso en la vuelta actual. Antes de cruzar la meta por primera vez (la grilla está
 * detrás de ella) el progreso se cuenta hacia atrás, en negativo, así que el auto de
 * adelante en la grilla tiene más distancia. Continua al cruzar la meta.
 */
export function getRaceDistance(laps: LapState, lapLength: number): number {
  'worklet';
  const progress = laps.progress ?? 0;
  if (laps.lapStartTick === null) {
    return progress - lapLength;
  }
  return laps.lapTicks.length * lapLength + progress;
}

/** Si el auto `a` va delante del `b`. Con todo igual, gana el de índice menor. */
function isAhead(a: PositionEntry, indexA: number, b: PositionEntry, indexB: number): boolean {
  'worklet';
  if (a.finishTick !== null && b.finishTick !== null) {
    return a.finishTick !== b.finishTick ? a.finishTick < b.finishTick : indexA < indexB;
  }
  if (a.finishTick !== null || b.finishTick !== null) {
    return a.finishTick !== null;
  }
  return a.raceDistance !== b.raceDistance ? a.raceDistance > b.raceDistance : indexA < indexB;
}

/**
 * Puesto de cada auto, en el orden de `entries`. Los que ya llegaron van primero, por
 * orden de llegada; el resto, por distancia de carrera. El empate lo gana el que está
 * antes en la lista (en la carrera, el jugador va último).
 */
export function getStandings(entries: readonly PositionEntry[]): Standing[] {
  'worklet';
  const standings: Standing[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    let place = 1;
    for (let j = 0; j < entries.length; j += 1) {
      if (j !== i && isAhead(entries[j], j, entries[i], i)) {
        place += 1;
      }
    }
    standings.push({ id: entries[i].id, place });
  }
  return standings;
}
