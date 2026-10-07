import type { Circuit, TrackData, TrackPoint } from '@/core/Track';

import type { TrackIssue, TrackValidationOptions } from './TrackValidation.types';

export const DEFAULT_VALIDATION_OPTIONS: TrackValidationOptions = {
  minSeparationWidths: 2,
  distinctSectionWidths: 4,
  radiusWindow: 4,
};

const distance = (a: TrackPoint, b: TrackPoint) => Math.hypot(b.x - a.x, b.z - a.z);

/** Signo del giro de a → b → c (producto vectorial). */
function orientation(a: TrackPoint, b: TrackPoint, c: TrackPoint): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

/** Si los segmentos p1–p2 y q1–q2 se cortan en un punto interior de ambos. */
function segmentsCross(p1: TrackPoint, p2: TrackPoint, q1: TrackPoint, q2: TrackPoint): boolean {
  const d1 = orientation(q1, q2, p1);
  const d2 = orientation(q1, q2, p2);
  const d3 = orientation(p1, p2, q1);
  const d4 = orientation(p1, p2, q2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Distancia de un punto a un segmento. */
function pointToSegment(point: TrackPoint, a: TrackPoint, b: TrackPoint): number {
  const abX = b.x - a.x;
  const abZ = b.z - a.z;
  const lengthSq = abX * abX + abZ * abZ;
  const t =
    lengthSq > 0
      ? Math.min(Math.max(((point.x - a.x) * abX + (point.z - a.z) * abZ) / lengthSq, 0), 1)
      : 0;
  return Math.hypot(point.x - (a.x + abX * t), point.z - (a.z + abZ * t));
}

/** Radio de la circunferencia que pasa por tres puntos (infinito si están alineados). */
function circumradius(a: TrackPoint, b: TrackPoint, c: TrackPoint): number {
  const cross = Math.abs(orientation(a, b, c));
  return cross > 0 ? (distance(a, b) * distance(b, c) * distance(c, a)) / (2 * cross) : Infinity;
}

/** Distancia desde el punto 0 hasta cada punto, y el largo de la vuelta. */
function measure(points: TrackPoint[]): { distances: number[]; length: number } {
  const distances = [0];
  for (let i = 1; i < points.length; i += 1) {
    distances.push(distances[i - 1] + distance(points[i - 1], points[i]));
  }
  return {
    distances,
    length: distances[points.length - 1] + distance(points[points.length - 1], points[0]),
  };
}

/**
 * Revisa que un trazado sirva como circuito: que sea una vuelta cerrada, que no se
 * cruce, que sus tramos distintos no se toquen y que ninguna curva sea tan cerrada
 * que el borde interior se pliegue. Devuelve la lista de problemas (vacía si está
 * bien). Recorre todos los pares de segmentos: es para tests y herramientas, no
 * para cada cuadro.
 */
export function validateTrack(
  track: TrackData,
  options: TrackValidationOptions = DEFAULT_VALIDATION_OPTIONS,
): TrackIssue[] {
  const points = track.centerline;
  const count = points.length;
  if (count < 3) {
    return [{ kind: 'too-few-points', count }];
  }
  if (
    !(track.width > 0) ||
    !Number.isFinite(track.width) ||
    points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.z))
  ) {
    return [{ kind: 'not-finite' }];
  }

  const issues: TrackIssue[] = [];
  const segmentLengths = points.map((point, i) => distance(point, points[(i + 1) % count]));
  segmentLengths.forEach((length, i) => {
    if (length === 0) {
      issues.push({ kind: 'repeated-point', index: (i + 1) % count });
    }
  });
  const closingGap = segmentLengths[count - 1];
  if (closingGap > Math.max(...segmentLengths.slice(0, -1)) + 1e-9) {
    issues.push({ kind: 'not-closed', gap: closingGap });
  }

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 2; j < count; j += 1) {
      // El último segmento es vecino del primero.
      if (i === 0 && j === count - 1) {
        continue;
      }
      if (segmentsCross(points[i], points[i + 1], points[j], points[(j + 1) % count])) {
        issues.push({ kind: 'self-crossing', segments: [i, j] });
      }
    }
  }

  const { distances, length } = measure(points);
  const minSeparation = options.minSeparationWidths * track.width;
  const distinct = options.distinctSectionWidths * track.width;
  // Distancia sobre el trazado entre dos puntos, por el camino corto.
  const along = (i: number, j: number) => {
    const raw = Math.abs(distances[i] - distances[j]);
    return Math.min(raw, length - raw);
  };
  let closest: { points: [number, number]; distance: number } | null = null;
  for (let i = 0; i < count; i += 1) {
    for (let j = 0; j < count; j += 1) {
      // El segmento j es del mismo tramo si alguno de sus extremos está cerca del punto i.
      if (Math.min(along(i, j), along(i, (j + 1) % count)) <= distinct) {
        continue;
      }
      const gap = pointToSegment(points[i], points[j], points[(j + 1) % count]);
      if (gap < minSeparation && (closest === null || gap < closest.distance)) {
        closest = { points: [i, j], distance: gap };
      }
    }
  }
  if (closest) {
    issues.push({ kind: 'sections-too-close', ...closest });
  }

  // Radio medido entre puntos a `radiusWindow` metros, para no confundir el ruido con curvas.
  const averageStep = length / count;
  const window = Math.max(1, Math.round(options.radiusWindow / averageStep));
  let tightest: { index: number; radius: number } | null = null;
  for (let i = 0; i < count; i += 1) {
    const radius = circumradius(
      points[(i - window + count) % count],
      points[i],
      points[(i + window) % count],
    );
    if (radius <= track.width / 2 && (tightest === null || radius < tightest.radius)) {
      tightest = { index: i, radius };
    }
  }
  if (tightest) {
    issues.push({ kind: 'curve-too-tight', ...tightest });
  }
  return issues;
}

/** Como `validateTrack`, y además que los puntos de control estén en orden dentro de la vuelta. */
export function validateCircuit(
  circuit: Circuit,
  options: TrackValidationOptions = DEFAULT_VALIDATION_OPTIONS,
): TrackIssue[] {
  const issues = validateTrack(circuit, options);
  const ordered = circuit.checkpoints.every(
    (checkpoint, i) =>
      checkpoint > 0 &&
      checkpoint < circuit.length &&
      (i === 0 || checkpoint > circuit.checkpoints[i - 1]),
  );
  if (!ordered) {
    issues.push({ kind: 'checkpoints-out-of-order' });
  }
  return issues;
}
