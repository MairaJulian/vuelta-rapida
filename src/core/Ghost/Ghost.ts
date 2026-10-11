import { clamp, wrapAngle } from '@/core/MathUtils';
import { getNearestOnCenterline, getProgressAt, getProgressDelta } from '@/core/Track';
import type { Circuit } from '@/core/Track';
import type { LapState } from '@/core/LapTimer';

import type { GhostPlayback, GhostPose, GhostRecording, GhostSource } from './Ghost.types';

/** Muestras por segundo de la grabación (el paso de la simulación va a 60). */
export const GHOST_SAMPLE_HZ = 30;

/**
 * Pasos de simulación entre dos muestras de la grabación: lo que más se acerca a
 * `GHOST_SAMPLE_HZ`, y al menos 1. Con la simulación a 60 pasos por segundo, 2.
 */
export function getGhostSampleGap(stepHz: number): number {
  'worklet';
  return Math.max(1, Math.round(stepHz / GHOST_SAMPLE_HZ));
}

/** Versión del formato de la grabación (`GhostRecording.v`). */
export const GHOST_FORMAT_VERSION = 1;

/** Fantasmas que se pueden elegir, en el orden en que se muestran. */
export const GHOST_SOURCES: readonly GhostSource[] = ['mine', 'record', 'none'];

/** El fantasma por defecto: la mejor vuelta del jugador. */
export const DEFAULT_GHOST_SOURCE: GhostSource = 'mine';

/** Posición: centímetros. Rumbo: milésimas de radián. */
const POSITION_SCALE = 100;
const HEADING_SCALE = 1000;
/** Tope de muestras de una grabación (una hora a 30 por segundo): lo demás es un dato roto. */
const MAX_SAMPLES = 108000;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Codifica las muestras de una vuelta: `samples` es una lista plana `[x, z, rumbo, ...]`
 * en metros y radianes, con la última muestra en la meta. Devuelve `null` si no alcanzan
 * para reproducir (menos de dos muestras) o traen valores que no son números.
 */
export function encodeGhost(
  samples: readonly number[],
  hz: number,
  lapMs: number,
): GhostRecording | null {
  const count = Math.floor(samples.length / 3);
  if (
    count < 2 ||
    count > MAX_SAMPLES ||
    !isFiniteNumber(hz) ||
    hz <= 0 ||
    !isFiniteNumber(lapMs) ||
    lapMs <= 0 ||
    samples.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }
  const d: number[] = [];
  let previousX = 0;
  let previousZ = 0;
  let previousHeading = 0;
  let rawHeading = samples[2];
  let unwrapped = samples[2];
  for (let i = 0; i < count; i += 1) {
    const x = Math.round(samples[3 * i] * POSITION_SCALE);
    const z = Math.round(samples[3 * i + 1] * POSITION_SCALE);
    if (i > 0) {
      // El rumbo sigue de la muestra anterior por el camino corto: no salta al dar la vuelta.
      unwrapped += wrapAngle(samples[3 * i + 2] - rawHeading);
      rawHeading = samples[3 * i + 2];
    }
    const heading = Math.round(unwrapped * HEADING_SCALE);
    d.push(x - previousX, z - previousZ, heading - previousHeading);
    previousX = x;
    previousZ = z;
    previousHeading = heading;
  }
  return { v: GHOST_FORMAT_VERSION, hz, lapMs: Math.round(lapMs * 1000) / 1000, d };
}

/**
 * Lee una grabación guardada: `null` si no es una grabación válida (versión que no se
 * conoce, tiempos que no cierran o datos que no son enteros). Un dato roto no entra:
 * mejor sin fantasma que un fantasma que salta por la pista.
 */
export function parseGhostRecording(value: unknown): GhostRecording | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { v, hz, lapMs, d } = value as Record<string, unknown>;
  if (
    v !== GHOST_FORMAT_VERSION ||
    !isFiniteNumber(hz) ||
    hz <= 0 ||
    !isFiniteNumber(lapMs) ||
    lapMs <= 0 ||
    !Array.isArray(d) ||
    d.length % 3 !== 0 ||
    d.length < 6 ||
    d.length > 3 * MAX_SAMPLES ||
    !d.every((item) => typeof item === 'number' && Number.isInteger(item))
  ) {
    return null;
  }
  const count = d.length / 3;
  // La última muestra cae en `lapMs`: tiene que venir después de la anterior.
  if (lapMs < ((count - 2) * 1000) / hz - 1) {
    return null;
  }
  return { v: GHOST_FORMAT_VERSION, hz, lapMs, d: [...d] as number[] };
}

/**
 * Deshace la codificación: tiempos, posiciones y rumbos de cada muestra. El progreso
 * sobre el trazado lo agrega `createGhostPlayback`.
 */
export function decodeGhost(
  recording: GhostRecording,
): Pick<GhostPlayback, 'timesMs' | 'x' | 'z' | 'heading' | 'durationMs'> {
  const count = recording.d.length / 3;
  const timesMs: number[] = [];
  const x: number[] = [];
  const z: number[] = [];
  const heading: number[] = [];
  let qx = 0;
  let qz = 0;
  let qh = 0;
  for (let i = 0; i < count; i += 1) {
    qx += recording.d[3 * i];
    qz += recording.d[3 * i + 1];
    qh += recording.d[3 * i + 2];
    x.push(qx / POSITION_SCALE);
    z.push(qz / POSITION_SCALE);
    heading.push(qh / HEADING_SCALE);
    timesMs.push(i === count - 1 ? recording.lapMs : (i * 1000) / recording.hz);
  }
  return { timesMs, x, z, heading, durationMs: recording.lapMs };
}

/**
 * Arma lo que necesita la reproducción: las muestras decodificadas y el progreso de
 * cada una sobre el circuito (el punto más cercano al trazado, sin dar la vuelta). Corre
 * en el hilo de JS, una vez por carrera: recorre la grabación entera.
 */
export function createGhostPlayback(recording: GhostRecording, circuit: Circuit): GhostPlayback {
  const decoded = decodeGhost(recording);
  const progress: number[] = [];
  let segment: number | undefined;
  let previousRaw = 0;
  let current = 0;
  decoded.x.forEach((x, i) => {
    const hit = getNearestOnCenterline(circuit, x, decoded.z[i], segment);
    segment = hit.segment;
    const raw = getProgressAt(circuit, hit);
    if (i === 0) {
      // Una vuelta que parte antes de la meta (la largada, 15 m atrás) empieza en negativo.
      current = raw > circuit.length / 2 ? raw - circuit.length : raw;
    } else {
      current += getProgressDelta(previousRaw, raw, circuit.length);
    }
    previousRaw = raw;
    // Sin retroceder: un trompo o un roce no hacen que el fantasma "desande".
    progress.push(progress.length > 0 ? Math.max(progress[progress.length - 1], current) : current);
  });
  return { ...decoded, progress };
}

/** Índice del último tiempo que no pasa de `timeMs`, entre 0 y `count - 2`. Búsqueda binaria. */
function findSample(timesMs: number[], timeMs: number): number {
  'worklet';
  let low = 0;
  let high = timesMs.length - 2;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (timesMs[middle] <= timeMs) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

/**
 * Dónde está el fantasma `timeMs` después del inicio de su vuelta, interpolando entre
 * las dos muestras que lo rodean. No depende de los cuadros por segundo: cualquier
 * tiempo da una posición. Antes del inicio queda en la primera muestra, y después del
 * final, en la última (en la meta, esperando que el jugador termine su vuelta).
 */
export function getGhostPose(playback: GhostPlayback, timeMs: number): GhostPose {
  'worklet';
  const { timesMs, x, z, heading } = playback;
  const last = timesMs.length - 1;
  if (last < 1 || timeMs <= timesMs[0]) {
    return { x: x[0], z: z[0], heading: heading[0] };
  }
  if (timeMs >= timesMs[last]) {
    return { x: x[last], z: z[last], heading: heading[last] };
  }
  const i = findSample(timesMs, timeMs);
  const span = timesMs[i + 1] - timesMs[i];
  const t = span > 0 ? (timeMs - timesMs[i]) / span : 0;
  return {
    x: x[i] + (x[i + 1] - x[i]) * t,
    z: z[i] + (z[i + 1] - z[i]) * t,
    // El rumbo guardado es continuo: se interpola derecho, sin saltos de π a −π.
    heading: heading[i] + (heading[i + 1] - heading[i]) * t,
  };
}

/**
 * Progreso del auto en su vuelta, en metros desde la meta y sin dar la vuelta: igual
 * que el de las muestras del fantasma. Antes de cruzar la meta por primera vez (la
 * largada, unos metros antes de ella) es negativo.
 */
export function getLapProgress(laps: LapState, lapLength: number): number {
  'worklet';
  const raw = laps.progress ?? 0;
  return laps.gatesPassed === 0 && raw > lapLength / 2 ? raw - lapLength : raw;
}

/**
 * Diferencia con el fantasma, en segundos: positiva si el jugador va atrás (más
 * lento), negativa si va adelante. Compara el progreso del auto con el del fantasma:
 * busca el instante en que el fantasma estaba donde está el auto ahora y lo resta del
 * tiempo de la vuelta. Así la diferencia es en segundos reales y sigue siendo exacta
 * en las curvas lentas, donde dividir los metros de ventaja por la velocidad no lo es.
 * Antes de que el fantasma empiece a avanzar vale el tiempo de la vuelta; si el auto
 * pasó el final de la grabación, la diferencia es contra la vuelta entera.
 */
export function getGhostGap(playback: GhostPlayback, lapMs: number, progress: number): number {
  'worklet';
  const { progress: ahead, timesMs } = playback;
  const last = ahead.length - 1;
  if (last < 1) {
    return 0;
  }
  let reachedMs: number;
  if (progress <= ahead[0]) {
    reachedMs = timesMs[0];
  } else if (progress >= ahead[last]) {
    reachedMs = timesMs[last];
  } else {
    // Último índice con progreso menor o igual (la lista no decrece).
    let low = 0;
    let high = last - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (ahead[middle] <= progress) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    const span = ahead[low + 1] - ahead[low];
    const t = span > 0 ? clamp((progress - ahead[low]) / span, 0, 1) : 0;
    reachedMs = timesMs[low] + (timesMs[low + 1] - timesMs[low]) * t;
  }
  return (lapMs - reachedMs) / 1000;
}
