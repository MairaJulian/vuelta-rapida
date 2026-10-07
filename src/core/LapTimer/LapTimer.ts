import { getProgressDelta } from '@/core/Track';

import type { LapGates, LapState } from './LapTimer.types';

/**
 * Avance máximo creíble en un paso, en metros. A 60 pasos por segundo el auto
 * recorre menos de un metro; un salto mayor (un atajo, un reinicio) no cruza puertas.
 */
export const MAX_PROGRESS_STEP = 10;

/** Vueltas sin empezar: el auto todavía no leyó su progreso ni cruzó la meta. */
export function createLapState(): LapState {
  'worklet';
  return {
    tick: 0,
    progress: null,
    gatesPassed: 0,
    lapStartTick: null,
    lapTicks: [],
    bestLapTicks: null,
  };
}

/** Distancia desde la meta de la puerta `index` de la secuencia (0 = meta). */
function gatePosition(gates: LapGates, index: number): number {
  'worklet';
  const kind = index % (gates.checkpoints.length + 1);
  return kind === 0 ? 0 : gates.checkpoints[kind - 1];
}

/** Si avanzar `delta` (> 0) desde `from` cruza la puerta en `gate`: from < puerta ≤ from + delta. */
function crossesForward(from: number, delta: number, gate: number, length: number): boolean {
  'worklet';
  let ahead = (((gate - from) % length) + length) % length;
  if (ahead === 0) {
    ahead = length;
  }
  return ahead <= delta;
}

/** Si retroceder `delta` (< 0) desde `from` cruza la puerta en `gate`: from + delta < puerta ≤ from. */
function crossesBackward(from: number, delta: number, gate: number, length: number): boolean {
  'worklet';
  const behind = (((from - gate) % length) + length) % length;
  return behind < -delta;
}

/** La vuelta más corta, o `null` si no hay ninguna. */
function shortest(laps: number[]): number | null {
  'worklet';
  let best: number | null = null;
  for (const lap of laps) {
    if (best === null || lap < best) {
      best = lap;
    }
  }
  return best;
}

/**
 * Procesa el progreso de un paso de simulación. Pura y determinista.
 *
 * - Las puertas cuentan solo en orden: cruzar hacia adelante la que sigue la pasa;
 *   cruzar hacia atrás la última pasada la deshace. Así ir y volver sobre la meta
 *   no suma vueltas, y una vuelta sin todos los puntos de control no se completa.
 * - La primera vez que se cruza la meta empieza la vuelta 1. Cada cruce siguiente,
 *   con los puntos de control pasados, completa una vuelta y empieza otra.
 * - Si se cruza la meta hacia atrás justo después de completar una vuelta, esa
 *   vuelta se deshace (y vuelve a completarse al cruzar otra vez, con su tiempo real).
 * - Un salto de más de `MAX_PROGRESS_STEP` no cruza ninguna puerta.
 */
export function stepLapTimer(
  state: LapState,
  progress: number,
  gates: LapGates,
  tick: number,
): LapState {
  'worklet';
  const from = state.progress;
  if (from === null) {
    return { ...state, tick, progress };
  }
  const delta = getProgressDelta(from, progress, gates.length);
  if (delta === 0 || Math.abs(delta) > MAX_PROGRESS_STEP) {
    return { ...state, tick, progress };
  }

  const sequence = gates.checkpoints.length + 1;
  let { gatesPassed, lapStartTick, lapTicks, bestLapTicks } = state;
  for (let guard = 0; guard < sequence; guard += 1) {
    if (delta > 0) {
      if (!crossesForward(from, delta, gatePosition(gates, gatesPassed), gates.length)) {
        break;
      }
      if (gatesPassed % sequence === 0) {
        // Meta: completa la vuelta en curso (si había una) y empieza la siguiente.
        if (lapStartTick !== null) {
          lapTicks = [...lapTicks, tick - lapStartTick];
          bestLapTicks = shortest(lapTicks);
        }
        lapStartTick = tick;
      }
      gatesPassed += 1;
    } else {
      if (
        gatesPassed === 0 ||
        !crossesBackward(from, delta, gatePosition(gates, gatesPassed - 1), gates.length)
      ) {
        break;
      }
      gatesPassed -= 1;
      if (gatesPassed % sequence === 0) {
        if (gatesPassed === 0 || lapStartTick === null) {
          // Vuelve a antes de la largada.
          lapStartTick = null;
        } else {
          // Deshace la última vuelta completa: la vuelta en curso vuelve a ser esa.
          const undone = lapTicks[lapTicks.length - 1];
          lapTicks = lapTicks.slice(0, -1);
          lapStartTick -= undone;
          bestLapTicks = shortest(lapTicks);
        }
      }
    }
  }
  return { tick, progress, gatesPassed, lapStartTick, lapTicks, bestLapTicks };
}

/** Vuelta en curso, empezando en 1; 0 antes de cruzar la meta por primera vez. */
export function getCurrentLap(state: LapState): number {
  'worklet';
  return state.lapStartTick === null ? 0 : state.lapTicks.length + 1;
}

/** Pasos que lleva la vuelta en curso (0 antes de largar). */
export function getCurrentLapTicks(state: LapState): number {
  'worklet';
  return state.lapStartTick === null ? 0 : state.tick - state.lapStartTick;
}

/** Pasos de simulación a milisegundos. */
export function ticksToMs(ticks: number, stepHz: number): number {
  'worklet';
  return (ticks * 1000) / stepHz;
}

/** Tiempo de vuelta como en el handoff: "m:ss.mmm" (por ejemplo "1:04.318"). */
export function formatLapTime(ms: number): string {
  'worklet';
  const total = Number.isFinite(ms) && ms > 0 ? Math.round(ms) : 0;
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
