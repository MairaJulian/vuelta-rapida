import { createLapState } from '@/core/LapTimer';
import { OVAL_CIRCUIT } from '@/core/Track';
import type { Circuit } from '@/core/Track';

import {
  createGhostPlayback,
  encodeGhost,
  getGhostGap,
  getGhostPose,
  getLapProgress,
  parseGhostRecording,
} from './Ghost';

const circuit: Circuit = OVAL_CIRCUIT;

/** Punto del trazado a `distance` metros de la meta (interpola entre puntos). */
function pointAt(distance: number) {
  const { centerline, distances, length } = circuit;
  const s = ((distance % length) + length) % length;
  let i = distances.findIndex((value) => value > s) - 1;
  if (i < 0) {
    i = distances.length - 1;
  }
  const a = centerline[i];
  const b = centerline[(i + 1) % centerline.length];
  const end = i + 1 < distances.length ? distances[i + 1] : length;
  const t = (s - distances[i]) / (end - distances[i]);
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    heading: Math.atan2(b.x - a.x, a.z - b.z),
  };
}

/** Vuelta entera a velocidad constante, con una muestra cada 1/30 s y la última en la meta. */
function recordLap(speed: number, startDistance = 0) {
  const lapMs = ((circuit.length - startDistance) / speed) * 1000;
  const samples: number[] = [];
  const step = 1000 / 30;
  for (let t = 0; t < lapMs; t += step) {
    const p = pointAt(startDistance + (speed * t) / 1000);
    samples.push(p.x, p.z, p.heading);
  }
  const end = pointAt(circuit.length);
  samples.push(end.x, end.z, end.heading);
  const recording = encodeGhost(samples, 30, lapMs);
  if (!recording) {
    throw new Error('grabación inválida');
  }
  return { recording, lapMs };
}

describe('reproducción por interpolación', () => {
  it('una grabación codificada se reproduce con la precisión del formato (1 cm, 1 mrad)', () => {
    const samples = [10, -5, 0.2, 10.4, -5.3, 0.25, 11, -5.5, 0.3];
    const recording = encodeGhost(samples, 30, 70)!;
    const playback = createGhostPlayback(recording, circuit);
    expect(playback.x[0]).toBeCloseTo(10, 2);
    expect(playback.z[1]).toBeCloseTo(-5.3, 2);
    expect(playback.heading[2]).toBeCloseTo(0.3, 3);
    expect(playback.timesMs).toEqual([0, 1000 / 30, 70]);
  });

  it('entre dos muestras da el punto intermedio, sin depender de los cuadros por segundo', () => {
    const { recording, lapMs } = recordLap(30);
    const playback = createGhostPlayback(recording, circuit);
    // A 30 m/s por la recta de arriba: la posición es lineal con el tiempo, a cualquier ritmo.
    for (const fps of [24, 60, 144]) {
      for (let t = 0; t < 2000; t += 1000 / fps) {
        const pose = getGhostPose(playback, t);
        const expected = pointAt((30 * t) / 1000);
        expect(pose.x).toBeCloseTo(expected.x, 1);
        expect(pose.z).toBeCloseTo(expected.z, 1);
      }
    }
    expect(lapMs).toBeGreaterThan(20000);
  });

  it('interpola a mitad de camino y respeta el rumbo (también al dar la vuelta de π a −π)', () => {
    const recording = encodeGhost([0, 0, 3.1, 10, 0, -3.1], 30, 1000 / 30)!;
    const playback = createGhostPlayback(recording, circuit);
    const middle = getGhostPose(playback, 1000 / 60);
    expect(middle.x).toBeCloseTo(5, 2);
    // Pasa por π (el camino corto), no por 0.
    expect(Math.cos(middle.heading)).toBeLessThan(-0.99);
  });

  it('antes del inicio queda en la primera muestra y después del final, en la última', () => {
    const { recording, lapMs } = recordLap(30);
    const playback = createGhostPlayback(recording, circuit);
    expect(getGhostPose(playback, -500)).toEqual(getGhostPose(playback, 0));
    const end = getGhostPose(playback, lapMs + 5000);
    expect(end).toEqual(getGhostPose(playback, playback.durationMs));
    expect(Math.hypot(end.x - playback.x[0], end.z - playback.z[0])).toBeLessThan(0.1);
  });

  it('descarta grabaciones rotas', () => {
    expect(encodeGhost([1, 2, 3], 30, 1000)).toBeNull();
    expect(encodeGhost([1, 2, 3, 4, NaN, 6], 30, 1000)).toBeNull();
    expect(parseGhostRecording({ v: 2, hz: 30, lapMs: 1000, d: [0, 0, 0, 1, 1, 1] })).toBeNull();
    expect(parseGhostRecording({ v: 1, hz: 30, lapMs: 1000, d: [0, 0, 0, 1.5, 1, 1] })).toBeNull();
    expect(parseGhostRecording({ v: 1, hz: 30, lapMs: 1000, d: [0, 0, 0] })).toBeNull();
    expect(parseGhostRecording(null)).toBeNull();
    const valid = encodeGhost([0, 0, 0, 1, 1, 0.1], 30, 50)!;
    expect(parseGhostRecording(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });
});

describe('diferencia con el fantasma', () => {
  const { recording } = recordLap(30);
  const playback = createGhostPlayback(recording, circuit);

  it('el progreso de las muestras crece desde la meta, sin dar la vuelta', () => {
    expect(playback.progress[0]).toBeCloseTo(0, 1);
    expect(playback.progress.at(-1)).toBeGreaterThan(circuit.length - 1);
    for (let i = 1; i < playback.progress.length; i += 1) {
      expect(playback.progress[i]).toBeGreaterThanOrEqual(playback.progress[i - 1]);
    }
  });

  it('en el mismo punto y al mismo tiempo, la diferencia es 0', () => {
    expect(getGhostGap(playback, 10000, 300)).toBeCloseTo(0, 2);
  });

  it('más lento: positiva, en segundos reales', () => {
    // El fantasma pasó los 270 m a los 9 s; el jugador llega a los 10 s.
    expect(getGhostGap(playback, 10000, 270)).toBeCloseTo(1, 2);
  });

  it('más rápido: negativa', () => {
    // El fantasma pasó los 300 m a los 10 s; el jugador llega a los 8,5 s.
    expect(getGhostGap(playback, 8500, 300)).toBeCloseTo(-1.5, 2);
  });

  it('antes de que el fantasma arranque cuenta el tiempo de la vuelta; al final, la vuelta entera', () => {
    expect(getGhostGap(playback, 1500, -15)).toBeCloseTo(1.5, 5);
    expect(getGhostGap(playback, 30000, circuit.length + 5)).toBeCloseTo(
      (30000 - playback.durationMs) / 1000,
      5,
    );
  });

  it('con un fantasma que partió antes de la meta, compara contra su largada', () => {
    const start = circuit.length - 15;
    const behind = recordLap(30, start);
    const standing = createGhostPlayback(behind.recording, circuit);
    expect(standing.progress[0]).toBeCloseTo(-15, 1);
    // Pasa la meta a los 0,5 s: quien pasa a los 0,5 s va igual, quien pasa a los 1,5 s, 1 s atrás.
    expect(getGhostGap(standing, 500, 0)).toBeCloseTo(0, 2);
    expect(getGhostGap(standing, 1500, 0)).toBeCloseTo(1, 2);
  });
});

describe('progreso de la vuelta del auto', () => {
  const lap = (progress: number | null, gatesPassed: number) => ({
    ...createLapState(),
    progress,
    gatesPassed,
  });

  it('antes de cruzar la meta por primera vez, los metros que faltan son negativos', () => {
    expect(getLapProgress(lap(circuit.length - 15, 0), circuit.length)).toBeCloseTo(-15, 5);
    expect(getLapProgress(lap(3, 0), circuit.length)).toBe(3);
  });

  it('desde la primera meta es el progreso sobre el trazado', () => {
    expect(getLapProgress(lap(circuit.length - 2, 2), circuit.length)).toBeCloseTo(
      circuit.length - 2,
    );
    expect(getLapProgress(lap(null, 0), circuit.length)).toBe(0);
  });
});
