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
