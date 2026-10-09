import { wrapAngle } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';
import { CURVATURE_WINDOW, EDGE_WIDTH_RATIO, getKerbFactor, KERB_WIDTH_RATIO } from '@/core/Track';
import type { Circuit, TrackPoint } from '@/core/Track';

import type {
  RunoffConfig,
  TightCorner,
  TrackClearance,
  TrackSample,
  TrackSide,
  TrackStraight,
} from './TrackFeatures.types';

/**
 * Radio por debajo del cual una curva obliga a frenar, en metros. En el Autódromo del
 * Lago quedan la chicana y la horquilla, las dos curvas que el trazado pide frenar.
 */
export const TIGHT_CORNER_RADIUS = 45;
/** Dos tramos cerrados separados por hasta estos metros son una sola curva (una chicana). */
export const TIGHT_CORNER_MERGE_GAP = 30;
/** Un tramo cerrado más corto que esto, en metros, no cuenta como curva. */
export const TIGHT_CORNER_MIN_LENGTH = 6;
/** Metros desde la entrada con que se decide hacia dónde gira una curva. */
const CORNER_DIRECTION_SPAN = 15;
/** Separación de las muestras de curvatura, en metros. */
const CURVATURE_STEP = 1;
/** Curvatura (1/m) por debajo de la cual un punto con piano se trata como recto. */
const STRAIGHT_CURVATURE = 1 / 1000;
/** Lado de cada celda de la grilla de la zona libre, en metros. */
export const CLEARANCE_CELL_SIZE = 16;

/** Escapatorias por defecto. */
export const DEFAULT_RUNOFF: RunoffConfig = {
  straightRunoff: 3,
  curveRunoff: 12,
};

/** Rumbo para ir de un punto a otro (0 hacia -z, positivo en sentido horario). */
function headingBetween(from: TrackPoint, to: TrackPoint): Radians {
  return wrapAngle(Math.atan2(to.x - from.x, from.z - to.z));
}

/** Lleva una distancia a la vuelta: de 0 al largo (sin incluirlo). */
function wrapDistance(distance: number, length: number): number {
  return ((distance % length) + length) % length;
}

/** Si `distance` cae en el tramo que empieza en `start` y mide `length` (con vuelta). */
export function isWithinSection(
  distance: number,
  start: number,
  length: number,
  lapLength: number,
): boolean {
  return wrapDistance(distance - start, lapLength) <= length;
}

/**
 * Tramo del trazado en el que cae `distance` (con vuelta): el índice de su primer
 * punto. Búsqueda binaria sobre las distancias desde la meta.
 */
export function getSegmentAtDistance(circuit: Circuit, distance: number): number {
  const { distances, length } = circuit;
  const wrapped = wrapDistance(distance, length);
  let low = 0;
  let high = distances.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (distances[middle] <= wrapped) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

/**
 * Punto del trazado central a `distance` metros de la meta (con vuelta, también
 * negativa), interpolado dentro de su tramo, con el rumbo de ese tramo.
 */
export function getPointAtDistance(circuit: Circuit, distance: number): TrackSample {
  const { centerline: points, distances, length } = circuit;
  const wrapped = wrapDistance(distance, length);
  const low = getSegmentAtDistance(circuit, wrapped);
  const a = points[low];
  const b = points[(low + 1) % points.length];
  const end = low + 1 < distances.length ? distances[low + 1] : length;
  const span = end - distances[low];
  const t = span > 0 ? (wrapped - distances[low]) / span : 0;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    heading: headingBetween(a, b),
    distance: wrapped,
  };
}

/**
 * Curvatura con signo en un punto de la vuelta, en 1/m: el giro entre las cuerdas que
 * llegan desde `window` metros antes y salen hacia `window` metros después, dividido
 * por su largo medio. Usa puntos interpolados, así que no depende de cuán largos sean
 * los tramos del trazado. Positiva gira a la derecha (horario); su inversa es el radio.
 */
export function getSignedCurvature(
  circuit: Circuit,
  distance: number,
  window: number = CURVATURE_WINDOW,
): number {
  const before = getPointAtDistance(circuit, distance - window);
  const here = getPointAtDistance(circuit, distance);
  const after = getPointAtDistance(circuit, distance + window);
  const turn = wrapAngle(headingBetween(here, after) - headingBetween(before, here));
  const chord =
    (Math.hypot(here.x - before.x, here.z - before.z) +
      Math.hypot(after.x - here.x, after.z - here.z)) /
    2;
  return chord > 0 ? turn / chord : 0;
}

/**
 * Curvas cerradas de la vuelta: tramos donde el radio baja de `maxRadius`. Los tramos
 * separados por menos de `TIGHT_CORNER_MERGE_GAP` se unen (las dos mitades de una
 * chicana) y los más cortos que `TIGHT_CORNER_MIN_LENGTH` se descartan. Un trazado
 * todo cerrado (un círculo chico) no tiene entradas: devuelve una lista vacía.
 */
export function getTightCorners(
  circuit: Circuit,
  maxRadius: number = TIGHT_CORNER_RADIUS,
): TightCorner[] {
  const count = Math.max(3, Math.ceil(circuit.length / CURVATURE_STEP));
  const step = circuit.length / count;
  const curvature = Array.from({ length: count }, (_, k) => getSignedCurvature(circuit, k * step));
  const tight = curvature.map((value) => Math.abs(value) > 1 / maxRadius);
  const firstLoose = tight.indexOf(false);
  if (firstLoose < 0) {
    return [];
  }

  // Los tramos se cuentan en muestras desde la primera abierta: ninguna curva queda
  // partida en dos por la meta.
  const at = (offset: number) => (firstLoose + offset) % count;
  const runs: { from: number; to: number }[] = [];
  let from = -1;
  for (let offset = 1; offset <= count; offset += 1) {
    if (tight[at(offset)]) {
      from = from < 0 ? offset : from;
    } else if (from >= 0) {
      runs.push({ from, to: offset - 1 });
      from = -1;
    }
  }

  const merged: { from: number; to: number }[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && (run.from - last.to) * step <= TIGHT_CORNER_MERGE_GAP) {
      last.to = run.to;
    } else {
      merged.push({ ...run });
    }
  }
  if (merged.length > 1) {
    const first = merged[0];
    const last = merged[merged.length - 1];
    if ((first.from + count - last.to) * step <= TIGHT_CORNER_MERGE_GAP) {
      merged[0] = { from: last.from, to: first.to + count };
      merged.pop();
    }
  }

  return merged
    .filter((run) => (run.to - run.from) * step >= TIGHT_CORNER_MIN_LENGTH)
    .map((run) => {
      const samples = Array.from(
        { length: run.to - run.from + 1 },
        (_, i) => curvature[at(run.from + i)],
      );
      const entry = samples.slice(0, Math.max(1, Math.round(CORNER_DIRECTION_SPAN / step)));
      const turn = entry.reduce((sum, value) => sum + value, 0);
      const sharpest = Math.max(...samples.map(Math.abs));
      return {
        start: wrapDistance(at(run.from) * step, circuit.length),
        length: (run.to - run.from) * step,
        direction: turn >= 0 ? 1 : -1,
        minRadius: 1 / sharpest,
      };
    });
}

/**
 * Rectas de la vuelta: los tramos entre pianos, en el orden de la vuelta. Sin pianos,
 * la vuelta entera es una recta; si un piano cubre toda la vuelta, no hay rectas.
 */
export function getStraights(circuit: Circuit): TrackStraight[] {
  const { kerbs, length } = circuit;
  if (kerbs.length === 0) {
    return [{ start: 0, length, heading: getPointAtDistance(circuit, 0).heading }];
  }
  if (kerbs.some((kerb) => kerb.length >= length)) {
    return [];
  }
  const sorted = [...kerbs].sort((a, b) => a.start - b.start);
  return sorted
    .map((kerb, i) => {
      const next = sorted[(i + 1) % sorted.length];
      const start = wrapDistance(kerb.start + kerb.length, length);
      const span = wrapDistance(next.start - start, length);
      const from = getPointAtDistance(circuit, start);
      const to = getPointAtDistance(circuit, start + span);
      return { start, length: span, heading: headingBetween(from, to) };
    })
    .filter((straight) => straight.length > 0);
}

/** Recta principal: la que contiene la meta o, si la meta cae en una curva, la más larga. */
export function getMainStraight(circuit: Circuit): TrackStraight | null {
  const straights = getStraights(circuit);
  const withFinish = straights.find((straight) =>
    isWithinSection(0, straight.start, straight.length, circuit.length),
  );
  if (withFinish) {
    return withFinish;
  }
  return straights.reduce<TrackStraight | null>(
    (longest, straight) => (longest && longest.length >= straight.length ? longest : straight),
    null,
  );
}

/** Punto a `offset` metros del trazado hacia un lado, perpendicular al rumbo de la muestra. */
export function getSidePoint(sample: TrackSample, side: TrackSide, offset: number): TrackPoint {
  return {
    x: sample.x + Math.cos(sample.heading) * side * offset,
    z: sample.z + Math.sin(sample.heading) * side * offset,
  };
}

/**
 * Giro para un objeto alineado con la pista que lleva texto: su eje largo sigue al
 * rumbo y el texto queda derecho con la cámara fija (nunca cabeza abajo).
 */
export function getReadableRotation(heading: Radians): Radians {
  let rotation = wrapAngle(heading - Math.PI / 2);
  if (rotation > Math.PI / 2) {
    rotation -= Math.PI;
  } else if (rotation <= -Math.PI / 2) {
    rotation += Math.PI;
  }
  return rotation;
}

const cellKey = (column: number, row: number) => `${column},${row}`;

/**
 * Zona libre de cada lado de cada punto del trazado: medio ancho de la pista (hasta el
 * borde blanco, o hasta el borde del piano donde hay pianos) más la escapatoria. Del
 * lado de afuera de una curva con pianos la escapatoria es `curveRunoff`; en el resto,
 * `straightRunoff`. Arma también la grilla de tramos para `getClearanceOverlap`.
 */
export function createTrackClearance(
  circuit: Circuit,
  runoff: RunoffConfig = DEFAULT_RUNOFF,
  cellSize: number = CLEARANCE_CELL_SIZE,
): TrackClearance {
  const points = circuit.centerline;
  const left: number[] = [];
  const right: number[] = [];
  points.forEach((_, i) => {
    const distance = circuit.distances[i];
    const onKerb = getKerbFactor(circuit.kerbs, circuit.length, distance) > 0;
    const half = (circuit.width / 2) * (onKerb ? KERB_WIDTH_RATIO : EDGE_WIDTH_RATIO);
    let outside = 0;
    if (onKerb) {
      const curvature = getSignedCurvature(circuit, distance);
      if (curvature > STRAIGHT_CURVATURE) {
        outside = -1;
      } else if (curvature < -STRAIGHT_CURVATURE) {
        outside = 1;
      }
    }
    left.push(half + (outside === -1 ? runoff.curveRunoff : runoff.straightRunoff));
    right.push(half + (outside === 1 ? runoff.curveRunoff : runoff.straightRunoff));
  });

  const cells: Record<string, number[]> = {};
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    const fromColumn = Math.floor(Math.min(a.x, b.x) / cellSize);
    const toColumn = Math.floor(Math.max(a.x, b.x) / cellSize);
    const fromRow = Math.floor(Math.min(a.z, b.z) / cellSize);
    const toRow = Math.floor(Math.max(a.z, b.z) / cellSize);
    for (let column = fromColumn; column <= toColumn; column += 1) {
      for (let row = fromRow; row <= toRow; row += 1) {
        const key = cellKey(column, row);
        (cells[key] ??= []).push(i);
      }
    }
  });

  return {
    left,
    right,
    maxClearance: Math.max(...left, ...right),
    cellSize,
    cells,
  };
}

/**
 * Distancia libre desde el trazado central hacia un lado, a `distance` metros de la
 * meta. Dentro de un tramo pasa en línea recta de la de un punto a la del siguiente.
 */
export function getClearanceAt(
  clearance: TrackClearance,
  circuit: Circuit,
  distance: number,
  side: TrackSide,
): number {
  const { distances, length } = circuit;
  const wrapped = wrapDistance(distance, length);
  const i = getSegmentAtDistance(circuit, wrapped);
  const sides = side === 1 ? clearance.right : clearance.left;
  const end = i + 1 < distances.length ? distances[i + 1] : length;
  const t = end > distances[i] ? (wrapped - distances[i]) / (end - distances[i]) : 0;
  return sides[i] + (sides[(i + 1) % sides.length] - sides[i]) * t;
}

/**
 * Si un círculo de radio `radius` con centro en (x, z) queda fuera de la zona libre
 * de todos los tramos cercanos. Igual que `getClearanceOverlap(...) <= 0`, pero corta
 * en el primer tramo invadido y compara distancias al cuadrado: el generador de la
 * escenografía lo llama miles de veces.
 */
export function fitsClearance(
  clearance: TrackClearance,
  circuit: Circuit,
  x: number,
  z: number,
  radius: number,
): boolean {
  const points = circuit.centerline;
  const count = points.length;
  const reach = clearance.maxClearance + radius;
  const size = clearance.cellSize;
  const toColumn = Math.floor((x + reach) / size);
  const toRow = Math.floor((z + reach) / size);
  for (let column = Math.floor((x - reach) / size); column <= toColumn; column += 1) {
    for (let row = Math.floor((z - reach) / size); row <= toRow; row += 1) {
      const segments = clearance.cells[cellKey(column, row)];
      if (!segments) {
        continue;
      }
      for (const i of segments) {
        const a = points[i];
        const b = points[(i + 1) % count];
        const abX = b.x - a.x;
        const abZ = b.z - a.z;
        const lengthSq = abX * abX + abZ * abZ;
        const t =
          lengthSq > 0
            ? Math.min(Math.max(((x - a.x) * abX + (z - a.z) * abZ) / lengthSq, 0), 1)
            : 0;
        const dx = x - (a.x + abX * t);
        const dz = z - (a.z + abZ * t);
        const sides = abX * (z - a.z) - abZ * (x - a.x) >= 0 ? clearance.right : clearance.left;
        const required = sides[i] + (sides[(i + 1) % count] - sides[i]) * t + radius;
        if (dx * dx + dz * dz < required * required) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Cuánto invade la zona libre un círculo de radio `radius` con centro en (x, z), en
 * metros: positivo si la invade, cero o negativo si queda afuera. Revisa todos los
 * tramos cercanos, no solo el más próximo: un objeto entre dos partes de la pista
 * tiene que respetar la zona libre de las dos.
 */
export function getClearanceOverlap(
  clearance: TrackClearance,
  circuit: Circuit,
  x: number,
  z: number,
  radius: number,
): number {
  const points = circuit.centerline;
  const count = points.length;
  const reach = clearance.maxClearance + radius;
  const size = clearance.cellSize;
  let worst = -reach;
  for (
    let column = Math.floor((x - reach) / size);
    column <= Math.floor((x + reach) / size);
    column += 1
  ) {
    for (
      let row = Math.floor((z - reach) / size);
      row <= Math.floor((z + reach) / size);
      row += 1
    ) {
      const segments = clearance.cells[cellKey(column, row)];
      if (!segments) {
        continue;
      }
      for (const i of segments) {
        const a = points[i];
        const b = points[(i + 1) % count];
        const abX = b.x - a.x;
        const abZ = b.z - a.z;
        const lengthSq = abX * abX + abZ * abZ;
        const t =
          lengthSq > 0
            ? Math.min(Math.max(((x - a.x) * abX + (z - a.z) * abZ) / lengthSq, 0), 1)
            : 0;
        const distance = Math.hypot(x - (a.x + abX * t), z - (a.z + abZ * t));
        // Producto cruz: positivo a la derecha del tramo (x a la derecha, z hacia abajo).
        const cross = abX * (z - a.z) - abZ * (x - a.x);
        const sides = cross >= 0 ? clearance.right : clearance.left;
        const required = sides[i] + (sides[(i + 1) % count] - sides[i]) * t;
        worst = Math.max(worst, required + radius - distance);
      }
    }
  }
  return worst;
}
