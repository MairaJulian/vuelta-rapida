import type { PlanePoint, ResampledLoop } from './CatmullRom.types';

/** Centrípeta: no forma rulos ni picos aunque los puntos estén espaciados de forma despareja. */
const CENTRIPETAL = 0.5;
/** Evita dividir por cero si dos puntos de control coinciden. */
const MIN_KNOT_STEP = 1e-6;

/** Interpola entre `a` (en el nudo `ta`) y `b` (en `tb`) para el parámetro `t`. */
function blend(a: PlanePoint, b: PlanePoint, ta: number, tb: number, t: number): PlanePoint {
  const span = tb - ta;
  const wa = (tb - t) / span;
  const wb = (t - ta) / span;
  return { x: wa * a.x + wb * b.x, z: wa * a.z + wb * b.z };
}

/**
 * Curva Catmull-Rom cerrada que pasa por todos los puntos de control, en orden, y
 * vuelve al primero. Devuelve `samplesPerSegment` puntos por tramo, empezando en
 * el primer punto de control; el último tramo termina justo antes de volver a él.
 * Con `alpha` 0,5 (centrípeta) no hay rulos ni cúspides.
 */
export function sampleClosedCatmullRom(
  controlPoints: PlanePoint[],
  samplesPerSegment: number,
  alpha: number = CENTRIPETAL,
): PlanePoint[] {
  const count = controlPoints.length;
  if (count < 3) {
    return controlPoints.map((point) => ({ ...point }));
  }
  const knotStep = (a: PlanePoint, b: PlanePoint) =>
    Math.max(Math.pow(Math.hypot(b.x - a.x, b.z - a.z), alpha), MIN_KNOT_STEP);

  const samples: PlanePoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const p0 = controlPoints[(i - 1 + count) % count];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % count];
    const p3 = controlPoints[(i + 2) % count];
    const t0 = 0;
    const t1 = t0 + knotStep(p0, p1);
    const t2 = t1 + knotStep(p1, p2);
    const t3 = t2 + knotStep(p2, p3);
    for (let s = 0; s < samplesPerSegment; s += 1) {
      const t = t1 + ((t2 - t1) * s) / samplesPerSegment;
      // Algoritmo de Barry y Goldman: tres niveles de interpolación entre nudos.
      const a1 = blend(p0, p1, t0, t1, t);
      const a2 = blend(p1, p2, t1, t2, t);
      const a3 = blend(p2, p3, t2, t3, t);
      const b1 = blend(a1, a2, t0, t2, t);
      const b2 = blend(a2, a3, t1, t3, t);
      samples.push(blend(b1, b2, t1, t2, t));
    }
  }
  return samples;
}

/**
 * Remuestrea un lazo cerrado a distancia constante, lo más cerca posible de
 * `spacing` (la vuelta se reparte en partes iguales). El primer punto se conserva.
 */
export function resampleClosedPolyline(points: PlanePoint[], spacing: number): ResampledLoop {
  const count = points.length;
  const cumulative = [0];
  for (let i = 1; i <= count; i += 1) {
    const a = points[i - 1];
    const b = points[i % count];
    cumulative.push(cumulative[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const length = cumulative[count];
  const samples = Math.max(3, Math.round(length / Math.max(spacing, MIN_KNOT_STEP)));
  const step = length / samples;

  const resampled: PlanePoint[] = [];
  const distances: number[] = [];
  let segment = 0;
  for (let k = 0; k < samples; k += 1) {
    const target = k * step;
    while (segment < count - 1 && cumulative[segment + 1] < target) {
      segment += 1;
    }
    const a = points[segment];
    const b = points[(segment + 1) % count];
    const segmentLength = cumulative[segment + 1] - cumulative[segment];
    const t = segmentLength > 0 ? (target - cumulative[segment]) / segmentLength : 0;
    resampled.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    distances.push(target);
  }
  return { points: resampled, distances, length };
}
