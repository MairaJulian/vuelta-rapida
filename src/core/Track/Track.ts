import { clamp, wrapAngle } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';

import type {
  CenterlineHit,
  FinishLine,
  OvalSpec,
  Pose,
  TrackData,
  TrackPoint,
} from './Track.types';

/** Distancia de la largada a la línea de meta, medida sobre el trazado, en metros. */
const START_GAP = 15;
const FINISH_LINE_THICKNESS = 1;
/** Radio por debajo del cual un tramo cuenta como curva y lleva pianos, en metros. */
export const CURVE_MAX_RADIUS = 150;

/** Quita el ruido de coma flotante de seno y coseno (precisión de un nanómetro). */
const tidy = (value: number) => Math.round(value * 1e9) / 1e9 || 0;

/**
 * Trazado de un óvalo tipo estadio centrado en el origen, recorrido en sentido
 * horario. Empieza en el centro de la recta superior mirando hacia +x.
 */
export function createOvalCenterline({
  straightLength,
  radius,
  segmentsPerCurve,
}: Omit<OvalSpec, 'width'>): TrackPoint[] {
  const half = straightLength / 2;
  const points: TrackPoint[] = [{ x: 0, z: -radius }];
  const addCurve = (centerX: number, fromAngle: number) => {
    for (let i = 0; i <= segmentsPerCurve; i += 1) {
      const angle = fromAngle + (Math.PI * i) / segmentsPerCurve;
      points.push({
        x: tidy(centerX + radius * Math.cos(angle)),
        z: tidy(radius * Math.sin(angle)),
      });
    }
  };
  // Curva derecha de arriba hacia abajo y curva izquierda de abajo hacia arriba
  // (z crece hacia abajo de la pantalla). Las rectas unen los extremos.
  addCurve(half, -Math.PI / 2);
  addCurve(-half, Math.PI / 2);
  return points;
}

/** Óvalo completo como datos de pista. */
export function createOvalTrack(spec: OvalSpec): TrackData {
  return { centerline: createOvalCenterline(spec), width: spec.width };
}

/** Óvalo de prueba: rectas de 200 m, curvas de 50 m de radio y 14 m de ancho. Unos 714 m por vuelta. */
export const DEFAULT_TRACK: TrackData = createOvalTrack({
  straightLength: 200,
  radius: 50,
  width: 14,
  segmentsPerCurve: 32,
});

/** Rumbo para ir de un punto a otro (0 hacia -z, positivo en sentido horario). */
function headingBetween(from: TrackPoint, to: TrackPoint): Radians {
  return wrapAngle(Math.atan2(to.x - from.x, from.z - to.z));
}

/**
 * Tramos curvos del trazado, para dibujar los pianos. Un punto es curvo si la
 * curvatura (el giro en ese punto dividido por el largo medio de sus dos tramos)
 * supera `1 / maxRadius`. Cada tramo incluye un punto más a cada lado, para cubrir
 * la curva de punta a punta. Un trazado todo curvo devuelve la vuelta entera.
 */
export function getCurveSections(
  track: TrackData,
  maxRadius: number = CURVE_MAX_RADIUS,
): TrackPoint[][] {
  const points = track.centerline;
  const count = points.length;
  if (count < 3) {
    return [];
  }
  const curved = points.map((point, i) => {
    const previous = points[(i - 1 + count) % count];
    const next = points[(i + 1) % count];
    const turn = Math.abs(wrapAngle(headingBetween(point, next) - headingBetween(previous, point)));
    const averageLength =
      (Math.hypot(point.x - previous.x, point.z - previous.z) +
        Math.hypot(next.x - point.x, next.z - point.z)) /
      2;
    return averageLength > 0 && turn / averageLength > 1 / maxRadius;
  });

  const firstStraight = curved.indexOf(false);
  if (firstStraight < 0) {
    return [[...points, points[0]]];
  }
  const runs: number[][] = [];
  let run: number[] = [];
  // Empieza justo después de un punto recto y termina en él, así ninguna curva queda partida en dos.
  for (let step = 1; step <= count; step += 1) {
    const i = (firstStraight + step) % count;
    if (curved[i]) {
      run.push(i);
    } else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  }
  return runs.map((indices) => [
    points[(indices[0] - 1 + count) % count],
    ...indices.map((i) => points[i]),
    points[(indices[indices.length - 1] + 1) % count],
  ]);
}

/** Línea de meta en el punto 0, perpendicular al primer tramo. */
export function getFinishLine(track: TrackData): FinishLine {
  const [first, second] = track.centerline;
  return {
    x: first.x,
    z: first.z,
    heading: headingBetween(first, second),
    length: track.width,
    thickness: FINISH_LINE_THICKNESS,
  };
}

/** Largada: sobre el trazado, `START_GAP` metros antes de la meta y mirando hacia ella. */
export function getStartPose(track: TrackData): Pose {
  const points = track.centerline;
  const count = points.length;
  let remaining = START_GAP;
  // Recorre el trazado hacia atrás desde la meta hasta completar la distancia.
  for (let walked = 0; walked < count; walked += 1) {
    const to = points[(count - walked) % count];
    const from = points[count - walked - 1];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    if (length >= remaining) {
      const t = remaining / length;
      return {
        x: to.x + (from.x - to.x) * t,
        z: to.z + (from.z - to.z) * t,
        heading: headingBetween(from, to),
      };
    }
    remaining -= length;
  }
  // Pista más corta que la distancia de largada: larga sobre la meta.
  const finish = getFinishLine(track);
  return { x: finish.x, z: finish.z, heading: finish.heading };
}

/**
 * Punto del trazado central más cercano a (x, z). Recorre todos los segmentos:
 * con unas decenas de puntos es barato incluso en cada paso de la simulación.
 */
export function getNearestOnCenterline(track: TrackData, x: number, z: number): CenterlineHit {
  'worklet';
  const points = track.centerline;
  const count = points.length;
  if (count === 0) {
    return { x, z, distance: 0, segment: 0 };
  }
  let bestX = points[0].x;
  let bestZ = points[0].z;
  let bestDistanceSq = Infinity;
  let bestSegment = 0;
  for (let i = 0; i < count; i += 1) {
    const a = points[i];
    const b = points[i + 1 < count ? i + 1 : 0];
    const abX = b.x - a.x;
    const abZ = b.z - a.z;
    const lengthSq = abX * abX + abZ * abZ;
    const t = lengthSq > 0 ? clamp(((x - a.x) * abX + (z - a.z) * abZ) / lengthSq, 0, 1) : 0;
    const nearX = a.x + abX * t;
    const nearZ = a.z + abZ * t;
    const distanceSq = (x - nearX) * (x - nearX) + (z - nearZ) * (z - nearZ);
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestX = nearX;
      bestZ = nearZ;
      bestSegment = i;
    }
  }
  return { x: bestX, z: bestZ, distance: Math.sqrt(bestDistanceSq), segment: bestSegment };
}
