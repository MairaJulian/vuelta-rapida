import type { RandomResult, RandomState } from './SeededRandom.types';

/** Estado inicial a partir de una semilla cualquiera (se queda con 32 bits sin signo). */
export function createRandomState(seed: number): RandomState {
  'worklet';
  return Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 0;
}

/**
 * Siguiente número al azar, en [0, 1), con el algoritmo mulberry32. Pura: el mismo
 * estado da siempre el mismo número, así la carrera es reproducible con su semilla.
 */
export function nextRandom(state: RandomState): RandomResult {
  'worklet';
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

/** Número al azar en [min, max), con el estado para el siguiente. */
export function nextRandomBetween(state: RandomState, min: number, max: number): RandomResult {
  'worklet';
  const result = nextRandom(state);
  return { value: min + (max - min) * result.value, state: result.state };
}
