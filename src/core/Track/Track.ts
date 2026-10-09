import { clamp, wrapAngle } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';

import type {
  CenterlineHit,
  Circuit,
  CircuitSpec,
  FinishLine,
  FinishSign,
  KerbSection,
  OvalSpec,
  Pose,
  TrackData,
  TrackPoint,
} from './Track.types';

/** Distancia de la largada a la línea de meta, medida sobre el trazado, en metros. */
const START_GAP = 15;
/** Grosor de la bandera a cuadros: 14 dp del handoff con el asfalto de 110 dp = 14 m. */
const FINISH_LINE_THICKNESS = 1.8;
/** Radio por debajo del cual un tramo cuenta como curva y lleva pianos, en metros. */
export const CURVE_MAX_RADIUS = 150;
/** Ancho del borde blanco respecto del asfalto (handoff: trazo de 120 sobre 110). */
export const EDGE_WIDTH_RATIO = 120 / 110;
/** Ancho de los pianos respecto del asfalto (handoff: trazo de 138 sobre 110). */
export const KERB_WIDTH_RATIO = 138 / 110;
/**
 * Metros en que el piano pisable crece desde cada punta hasta su ancho completo.
 * Sin esta transición, un auto que sale del piano a fondo saltaría hacia adentro.
 */
export const KERB_TAPER = 4;

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

/**
 * Óvalo de prueba: rectas de 200 m, curvas de 50 m de radio y 14 m de ancho. Unos
 * 714 m por vuelta. Lo usan los tests de geometría; el juego corre en los circuitos
 * de `core/Circuits`.
 */
export const OVAL_TRACK: TrackData = createOvalTrack({
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
 * Largo de trazado sobre el que se mide la curvatura de cada punto, en metros. Con
 * puntos cada 2 m, medir contra el vecino inmediato amplifica el ruido del
 * remuestreo y parte los pianos en pedazos; 8 m lo suavizan sin borrar curvas.
 */
export const CURVATURE_WINDOW = 8;
/** Dos tramos curvos separados por hasta estos metros se dibujan como un solo piano. */
export const CURVE_MERGE_GAP = 24;
/** Un tramo curvo más corto que esto, en metros, no lleva piano. */
export const CURVE_MIN_LENGTH = 20;

/** Tramo curvo como puntos seguidos del trazado: `count` puntos desde `first` (con vuelta). */
interface CurveRun {
  first: number;
  count: number;
}

/**
 * Tramos curvos del trazado. Un punto es curvo si la curvatura (el giro entre los
 * puntos a unos `CURVATURE_WINDOW` metros antes y después, dividido por el largo
 * medio de esos dos tramos) supera `1 / maxRadius`. Con puntos más separados que la
 * ventana se usan los vecinos inmediatos. Los tramos separados por menos de
 * `CURVE_MERGE_GAP` se unen, y los más cortos que `CURVE_MIN_LENGTH` se descartan.
 * Cada tramo incluye un punto más a cada lado, para cubrir la curva de punta a
 * punta. Un trazado todo curvo devuelve la vuelta entera (un punto más que el trazado).
 */
function getCurveRuns(track: TrackData, maxRadius: number): CurveRun[] {
  const points = track.centerline;
  const count = points.length;
  if (count < 3) {
    return [];
  }
  let lapLength = 0;
  points.forEach((point, i) => {
    const next = points[(i + 1) % count];
    lapLength += Math.hypot(next.x - point.x, next.z - point.z);
  });
  const reach = Math.max(1, Math.round(CURVATURE_WINDOW / (lapLength / count)));
  const curved = points.map((point, i) => {
    const previous = points[(i - reach + count) % count];
    const next = points[(i + reach) % count];
    const turn = Math.abs(wrapAngle(headingBetween(point, next) - headingBetween(previous, point)));
    const averageLength =
      (Math.hypot(point.x - previous.x, point.z - previous.z) +
        Math.hypot(next.x - point.x, next.z - point.z)) /
      2;
    return averageLength > 0 && turn / averageLength > 1 / maxRadius;
  });

  const firstStraight = curved.indexOf(false);
  if (firstStraight < 0) {
    return [{ first: 0, count: count + 1 }];
  }
  // Los tramos se cuentan en pasos desde el primer punto recto, así ninguna curva
  // queda partida en dos por el punto 0. `along[s]` es lo recorrido hasta el paso s.
  const indexAt = (step: number) => (firstStraight + step) % count;
  const along = [0];
  for (let step = 0; step < 2 * count; step += 1) {
    const a = points[indexAt(step)];
    const b = points[indexAt(step + 1)];
    along.push(along[step] + Math.hypot(b.x - a.x, b.z - a.z));
  }

  let runs: { start: number; end: number }[] = [];
  let start = -1;
  for (let step = 1; step <= count; step += 1) {
    if (curved[indexAt(step)]) {
      start = start < 0 ? step : start;
    } else if (start >= 0) {
      runs.push({ start, end: step - 1 });
      start = -1;
    }
  }

  // Une tramos separados por un hueco corto: las dos mitades de una chicana, o una
  // curva cuya curvatura baja un momento del umbral. También a través del punto 0.
  const merged: { start: number; end: number }[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && along[run.start] - along[last.end] <= CURVE_MERGE_GAP) {
      last.end = run.end;
    } else {
      merged.push({ ...run });
    }
  }
  if (merged.length > 1) {
    const first = merged[0];
    const last = merged[merged.length - 1];
    if (along[first.start + count] - along[last.end] <= CURVE_MERGE_GAP) {
      merged[0] = { start: last.start, end: first.end + count };
      merged.pop();
    }
  }
  // Descarta los tramos sueltos demasiado cortos para leerse como un piano.
  runs = merged.filter((run) => along[run.end] - along[run.start] >= CURVE_MIN_LENGTH);

  return runs.map(({ start: from, end: to }) => ({
    first: indexAt(from - 1 + count),
    count: to - from + 3,
  }));
}

/**
 * Tramos curvos del trazado, para dibujar los pianos: los puntos de cada uno, de
 * punta a punta (ver `getCurveRuns`). Un trazado todo curvo devuelve la vuelta
 * entera, cerrada.
 */
export function getCurveSections(
  track: TrackData,
  maxRadius: number = CURVE_MAX_RADIUS,
): TrackPoint[][] {
  const points = track.centerline;
  return getCurveRuns(track, maxRadius).map(({ first, count }) =>
    Array.from({ length: count }, (_, i) => points[(first + i) % points.length]),
  );
}

/**
 * Tramos con pianos medidos sobre el trazado: los mismos tramos curvos que se
 * dibujan, como distancia desde la meta y largo. Con ellos la simulación sabe
 * dónde se puede pisar el piano.
 */
export function getKerbSections(
  track: TrackData,
  distances: number[],
  lapLength: number,
  maxRadius: number = CURVE_MAX_RADIUS,
): KerbSection[] {
  const count = track.centerline.length;
  return getCurveRuns(track, maxRadius).map(({ first, count: points }) => {
    if (points > count) {
      return { start: 0, length: lapLength };
    }
    const last = (first + points - 1) % count;
    const span = distances[last] - distances[first];
    return { start: distances[first], length: span < 0 ? span + lapLength : span };
  });
}

/**
 * Arma un circuito a partir de un trazado: calcula la distancia desde la meta
 * hasta cada punto, el largo de la vuelta, dónde caen los puntos de control y
 * dónde están los pianos.
 */
export function createCircuit({
  id,
  name,
  centerline,
  width,
  checkpointFractions,
}: CircuitSpec): Circuit {
  const distances = [0];
  for (let i = 1; i < centerline.length; i += 1) {
    const a = centerline[i - 1];
    const b = centerline[i];
    distances.push(distances[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const last = centerline[centerline.length - 1];
  const first = centerline[0];
  const length = distances[distances.length - 1] + Math.hypot(first.x - last.x, first.z - last.z);
  return {
    id,
    name,
    centerline,
    width,
    distances,
    length,
    checkpoints: checkpointFractions.map((fraction) => fraction * length),
    kerbs: getKerbSections({ centerline, width }, distances, length),
  };
}

/** El óvalo de prueba como circuito, con puntos de control en los tercios de la vuelta. */
export const OVAL_CIRCUIT: Circuit = createCircuit({
  id: 'ovalo-de-prueba',
  name: 'Óvalo de prueba',
  centerline: OVAL_TRACK.centerline,
  width: OVAL_TRACK.width,
  checkpointFractions: [1 / 3, 2 / 3],
});

/**
 * Cuánto del piano se puede pisar en un punto de la vuelta, de 0 a 1: 0 fuera de
 * los pianos, 1 en el medio, y en cada punta crece a lo largo de `KERB_TAPER`
 * metros. `progress` es la distancia desde la meta. Worklet.
 */
export function getKerbFactor(kerbs: KerbSection[], lapLength: number, progress: number): number {
  'worklet';
  let factor = 0;
  for (let i = 0; i < kerbs.length; i += 1) {
    const kerb = kerbs[i];
    if (kerb.length >= lapLength) {
      return 1;
    }
    const offset = (((progress - kerb.start) % lapLength) + lapLength) % lapLength;
    if (offset <= kerb.length) {
      const edge = Math.min(offset, kerb.length - offset);
      const value = KERB_TAPER > 0 ? Math.min(edge / KERB_TAPER, 1) : 1;
      factor = Math.max(factor, value);
    }
  }
  return factor;
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
 * Segmentos a cada lado del de referencia que revisa la búsqueda local. En un paso
 * el auto avanza menos de un metro; 25 segmentos son 50 m en los circuitos.
 */
export const NEAREST_SEARCH_WINDOW = 25;

/**
 * Busca el punto más cercano en `span` segmentos seguidos a partir de `first` (con
 * vuelta). Las funciones worklet van antes de las que las usan: el plugin de
 * worklets las convierte en constantes, que no se pueden usar antes de declararse.
 */
function searchSegments(
  track: TrackData,
  x: number,
  z: number,
  first: number,
  span: number,
): CenterlineHit {
  'worklet';
  const points = track.centerline;
  const count = points.length;
  let bestX = points[0].x;
  let bestZ = points[0].z;
  let bestDistanceSq = Infinity;
  let bestSegment = 0;
  let bestT = 0;
  for (let k = 0; k < span; k += 1) {
    const i = (((first + k) % count) + count) % count;
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
      bestT = t;
    }
  }
  return {
    x: bestX,
    z: bestZ,
    distance: Math.sqrt(bestDistanceSq),
    segment: bestSegment,
    t: bestT,
  };
}

/**
 * Punto del trazado central más cercano a (x, z).
 *
 * Sin `segmentHint` recorre todos los segmentos. Con el segmento del paso anterior
 * revisa solo los vecinos (`NEAREST_SEARCH_WINDOW` a cada lado): en la simulación,
 * que corre en el hilo de UI sin JIT, eso evita recorrer más de mil segmentos por
 * paso. Si la búsqueda local da un punto a más de un ancho de pista (el auto no
 * puede estar ahí), repite la búsqueda completa.
 */
export function getNearestOnCenterline(
  track: TrackData,
  x: number,
  z: number,
  segmentHint?: number,
): CenterlineHit {
  'worklet';
  const count = track.centerline.length;
  if (count === 0) {
    return { x, z, distance: 0, segment: 0, t: 0 };
  }
  if (
    segmentHint !== undefined &&
    segmentHint >= 0 &&
    segmentHint < count &&
    count > 2 * NEAREST_SEARCH_WINDOW + 1
  ) {
    const local = searchSegments(
      track,
      x,
      z,
      segmentHint - NEAREST_SEARCH_WINDOW,
      2 * NEAREST_SEARCH_WINDOW + 1,
    );
    if (local.distance <= track.width) {
      return local;
    }
  }
  return searchSegments(track, x, z, 0, count);
}

/** Progreso de un punto ya encontrado con `getNearestOnCenterline` (sin volver a buscarlo). */
export function getProgressAt(circuit: Circuit, hit: CenterlineHit): number {
  'worklet';
  const start = circuit.distances[hit.segment];
  const end =
    hit.segment + 1 < circuit.distances.length
      ? circuit.distances[hit.segment + 1]
      : circuit.length;
  const progress = start + (end - start) * hit.t;
  return progress >= circuit.length ? progress - circuit.length : progress;
}

/**
 * Progreso sobre el trazado: distancia desde la meta hasta el punto del trazado
 * central más cercano a (x, z), en metros, de 0 a `length` (sin incluirlo).
 */
export function getTrackProgress(circuit: Circuit, x: number, z: number): number {
  'worklet';
  return getProgressAt(circuit, getNearestOnCenterline(circuit, x, z));
}

/**
 * Cuánto se avanzó de un progreso a otro, por el camino corto: positivo hacia
 * adelante, negativo hacia atrás. Cruzar la meta no suma ni resta una vuelta.
 */
export function getProgressDelta(from: number, to: number, length: number): number {
  'worklet';
  let delta = to - from;
  if (delta > length / 2) {
    delta -= length;
  } else if (delta <= -length / 2) {
    delta += length;
  }
  return delta;
}

/**
 * Sentido de la carrera visto desde arriba (como en pantalla): 1 si es horario,
 * -1 si es antihorario. Suma lo que gira el trazado en una vuelta (±360°).
 */
export function getLapDirection(track: TrackData): 1 | -1 {
  const points = track.centerline;
  const count = points.length;
  let turn = 0;
  for (let i = 0; i < count; i += 1) {
    const previous = points[(i - 1 + count) % count];
    const point = points[i];
    const next = points[(i + 1) % count];
    turn += wrapAngle(headingBetween(point, next) - headingBetween(previous, point));
  }
  return turn >= 0 ? 1 : -1;
}

/**
 * Cartel "META": del lado de afuera del circuito, pegado al borde y justo después
 * de la línea en el sentido de la marcha, como en la escena del handoff. Las
 * medidas del cartel van en metros: `length` en el sentido de la marcha, `depth` a
 * lo ancho. Se gira para que el texto quede derecho (nunca cabeza abajo).
 */
export function getFinishSign(
  track: TrackData,
  length: number,
  depth: number,
  gap: number,
): FinishSign {
  const finish = getFinishLine(track);
  // En sentido horario el interior queda a la derecha: afuera es la izquierda.
  const outside = -getLapDirection(track);
  const forwardX = Math.sin(finish.heading);
  const forwardZ = -Math.cos(finish.heading);
  const rightX = Math.cos(finish.heading);
  const rightZ = Math.sin(finish.heading);
  const across = outside * (track.width / 2 + gap + depth / 2);
  const along = finish.thickness / 2 + gap + length / 2;
  let rotation = finish.heading - Math.PI / 2;
  if (rotation > Math.PI / 2) {
    rotation -= Math.PI;
  } else if (rotation <= -Math.PI / 2) {
    rotation += Math.PI;
  }
  return {
    x: finish.x + rightX * across + forwardX * along,
    z: finish.z + rightZ * across + forwardZ * along,
    rotation,
  };
}
