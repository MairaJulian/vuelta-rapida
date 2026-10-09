import { clamp } from '@/core/MathUtils';
import type { Radians } from '@/core/MathUtils';
import { createRandomState, nextRandom } from '@/core/SeededRandom';
import { getLapDirection, getNearestOnCenterline } from '@/core/Track';
import type { Circuit, TrackPoint } from '@/core/Track';
import {
  createTrackClearance,
  DEFAULT_RUNOFF,
  fitsClearance,
  getClearanceAt,
  getMainStraight,
  getPointAtDistance,
  getReadableRotation,
  getSegmentAtDistance,
  getSidePoint,
  getSignedCurvature,
  getStraights,
  getTightCorners,
  isWithinSection,
  TIGHT_CORNER_RADIUS,
} from '@/core/TrackFeatures';
import type { TightCorner, TrackClearance, TrackSide } from '@/core/TrackFeatures';

import type {
  AsphaltPatch,
  RectSize,
  Scenery,
  SceneryConfig,
  SceneryObject,
  SceneryObjectKind,
  ScenerySpec,
} from './Scenery.types';

/** Marcas inventadas de los carteles publicitarios. Nada de marcas reales. */
export const BILLBOARD_BRANDS = [
  'RAYO MATE',
  'GOMAS ÑANDÚ',
  'ALFAJORES COMETA',
  'LUBRI TERO',
  'RADIO VELOZ',
] as const;

/** Diámetro de cada tipo de vegetación, en metros: mínimo y máximo. */
export const VEGETATION_SIZES = {
  treeLarge: { min: 6.4, max: 7.6 },
  treeSmall: { min: 4.4, max: 5.4 },
  bush: { min: 2.2, max: 3 },
} as const;

/** Medidas de los carteles y la tribuna, en metros. */
export const DISTANCE_BOARD_SIZE: RectSize = { length: 2.6, depth: 2.6 };
export const BILLBOARD_SIZE: RectSize = { length: 10, depth: 2.4 };
export const GRANDSTAND_SIZE: RectSize = { length: 56, depth: 12 };

/** Neumáticos de las barreras: diámetro en metros y filas, desde la escapatoria hacia afuera. */
export const TYRE_DIAMETER = 1.2;
export const TYRE_ROWS = 2;

/** Ancho de cada marca de frenada, en metros, y separación entre las dos ruedas traseras. */
export const SKID_MARK_WIDTH = 0.3;
const SKID_WHEEL_OFFSET = 0.8;

/**
 * Altura de cada tipo de objeto, en metros. El paralaje desplaza lo más alto: con la
 * cámara cenital, la copa de un árbol se ve más corrida que su base.
 */
export const SCENERY_HEIGHTS: Record<SceneryObjectKind, number> = {
  treeLarge: 9,
  treeSmall: 6,
  bush: 1.5,
  distanceBoard: 3,
  billboard: 3,
  grandstand: 3,
};
/** Altura del techo de la tribuna, en metros. */
export const GRANDSTAND_ROOF_HEIGHT = 9;

/** Escenografía por defecto: semilla fija y densidad normal. */
export const DEFAULT_SCENERY_SPEC: ScenerySpec = { seed: 1, treeDensity: 1 };

export const DEFAULT_SCENERY_CONFIG: SceneryConfig = {
  runoff: DEFAULT_RUNOFF,
  tightCornerRadius: TIGHT_CORNER_RADIUS,
  boardDistances: [300, 200, 100],
  treesPerKm: 600,
  bushesPerKm: 320,
  treeBand: 45,
  bushBand: 14,
  billboardSpacing: 30,
  straightBillboardSpacing: 70,
  billboardMinStraight: 150,
  grandstandBeforeFinish: 32,
  patchSpacing: 18,
  skidZone: 70,
};

/** Las copas de dos árboles pueden taparse hasta este tanto: forman bosquecitos. */
const TREE_OVERLAP = 0.75;
/** Separación mínima entre objetos que no son árboles, en metros. */
const OBJECT_MARGIN = 0.5;
/** Espacio extra entre la escapatoria y un cartel o la tribuna, en metros. */
const SIGN_GAP = 0.4;
/** Hasta cuántos metros se corre un cartel hacia afuera si no entra en su lugar. */
const MAX_SIGN_PUSH = 6;
/** Zona de la meta sin parches: el cartel META y la bandera van ahí. */
const FINISH_CLEAR = 12;
/** Recta mínima para orientar las franjas del pasto, en metros. */
const STRIPE_MIN_STRAIGHT = 80;
/** Lado de la grilla de objetos ya ubicados, en metros. */
const OCCUPANCY_CELL = 12;
/** Cada cuántos metros del trazado se toma un punto de la línea de cada barrera. */
const TYRE_LINE_STEP = 1;
/** Las barreras siguen un poco más allá de cada punta de la curva, en metros. */
const TYRE_EXTENSION = 6;
/** Un tramo de curva más corto que esto, en metros, no lleva barrera propia. */
const MIN_BARRIER_RUN = 10;
/** Curvatura (1/m) por debajo de la cual un punto se trata como recto. */
const STRAIGHT_CURVATURE = 1 / 1000;

/** Redondea a milímetros (y a millonésimas los ángulos): datos prolijos y sin -0. */
const tidy = (value: number) => Math.round(value * 1000) / 1000 || 0;
const tidyAngle = (value: number) => Math.round(value * 1e6) / 1e6 || 0;

/** Si el objeto ocupa un círculo (árboles y arbustos) en vez de un rectángulo. */
export function isRoundObject(kind: SceneryObjectKind): boolean {
  return kind === 'treeLarge' || kind === 'treeSmall' || kind === 'bush';
}

/**
 * Puntos del borde del área que ocupa un objeto en el suelo, más su centro: cada
 * `step` metros en los rectángulos y 16 puntos en los círculos. Sirven para revisar
 * que nada pise la pista.
 */
export function getObjectOutline(object: SceneryObject, step = 1): TrackPoint[] {
  const points: TrackPoint[] = [{ x: object.x, z: object.z }];
  if (isRoundObject(object.kind)) {
    const radius = object.length / 2;
    for (let i = 0; i < 16; i += 1) {
      const angle = (i / 16) * Math.PI * 2;
      points.push({
        x: object.x + Math.cos(angle) * radius,
        z: object.z + Math.sin(angle) * radius,
      });
    }
    return points;
  }
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  const halfLength = object.length / 2;
  const halfDepth = object.depth / 2;
  const corners = [
    [-halfLength, -halfDepth],
    [halfLength, -halfDepth],
    [halfLength, halfDepth],
    [-halfLength, halfDepth],
  ];
  corners.forEach(([fromX, fromY], i) => {
    const [toX, toY] = corners[(i + 1) % corners.length];
    const parts = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) / step));
    for (let k = 0; k < parts; k += 1) {
      const localX = fromX + ((toX - fromX) * k) / parts;
      const localY = fromY + ((toY - fromY) * k) / parts;
      points.push({
        x: object.x + localX * cos - localY * sin,
        z: object.z + localX * sin + localY * cos,
      });
    }
  });
  return points;
}

/**
 * Rumbo de las franjas de corte del pasto: el que más se aparta de las rectas largas
 * (de 80 m o más). Paralelas a una recta, las franjas no darían ninguna referencia de
 * movimiento ahí. Prueba cada 5° y se queda con el mejor peor caso; si empata, con el
 * mejor promedio según el largo de las rectas.
 */
export function getGrassStripeAngle(circuit: Circuit): Radians {
  const straights = getStraights(circuit);
  const long = straights.filter((straight) => straight.length >= STRIPE_MIN_STRAIGHT);
  const considered = long.length > 0 ? long : straights;
  if (considered.length === 0) {
    return Math.PI / 4;
  }
  const total = considered.reduce((sum, straight) => sum + straight.length, 0);
  let best = 0;
  let bestWorst = -1;
  let bestMean = -1;
  for (let k = 0; k < 36; k += 1) {
    const angle = (k * Math.PI) / 36;
    let worst = 1;
    let weighted = 0;
    for (const straight of considered) {
      const crossing = Math.abs(Math.sin(angle - straight.heading));
      worst = Math.min(worst, crossing);
      weighted += crossing * straight.length;
    }
    const mean = weighted / total;
    if (worst > bestWorst + 1e-9 || (Math.abs(worst - bestWorst) <= 1e-9 && mean > bestMean)) {
      best = angle;
      bestWorst = worst;
      bestMean = mean;
    }
  }
  return tidyAngle(best);
}

type Shape =
  | { type: 'circle'; x: number; z: number; radius: number; role: 'tree' | 'bush' | 'tyre' }
  | { type: 'rect'; x: number; z: number; rotation: number; length: number; depth: number };

const boundingRadius = (shape: Shape) =>
  shape.type === 'circle' ? shape.radius : Math.hypot(shape.length, shape.depth) / 2;

/** Medio largo de un rectángulo proyectado sobre la dirección `angle`. */
function projectRect(shape: Extract<Shape, { type: 'rect' }>, angle: number): number {
  const delta = shape.rotation - angle;
  return (
    (shape.length / 2) * Math.abs(Math.cos(delta)) + (shape.depth / 2) * Math.abs(Math.sin(delta))
  );
}

/** Si un círculo y un rectángulo se tocan, con `margin` metros de separación. */
function circleTouchesRect(
  circle: Extract<Shape, { type: 'circle' }>,
  rect: Extract<Shape, { type: 'rect' }>,
  margin: number,
): boolean {
  const dx = circle.x - rect.x;
  const dz = circle.z - rect.z;
  const cos = Math.cos(rect.rotation);
  const sin = Math.sin(rect.rotation);
  const localX = dx * cos + dz * sin;
  const localY = -dx * sin + dz * cos;
  const nearX = clamp(localX, -rect.length / 2, rect.length / 2);
  const nearY = clamp(localY, -rect.depth / 2, rect.depth / 2);
  return Math.hypot(localX - nearX, localY - nearY) < circle.radius + margin;
}

/** Si dos áreas se tocan. Las copas de los árboles se pueden tapar un poco entre sí. */
function shapesTouch(a: Shape, b: Shape): boolean {
  if (a.type === 'circle' && b.type === 'circle') {
    const trees = a.role === 'tree' && b.role === 'tree';
    const reach = trees
      ? (a.radius + b.radius) * TREE_OVERLAP
      : a.radius + b.radius + OBJECT_MARGIN;
    return Math.hypot(a.x - b.x, a.z - b.z) < reach;
  }
  if (a.type === 'circle' && b.type === 'rect') {
    return circleTouchesRect(a, b, OBJECT_MARGIN);
  }
  if (a.type === 'rect' && b.type === 'circle') {
    return circleTouchesRect(b, a, OBJECT_MARGIN);
  }
  if (a.type === 'rect' && b.type === 'rect') {
    // Ejes separadores: los dos ejes de cada rectángulo.
    const axes = [a.rotation, a.rotation + Math.PI / 2, b.rotation, b.rotation + Math.PI / 2];
    return axes.every((angle) => {
      const gap = Math.abs((b.x - a.x) * Math.cos(angle) + (b.z - a.z) * Math.sin(angle));
      return gap < projectRect(a, angle) + projectRect(b, angle) + OBJECT_MARGIN;
    });
  }
  return false;
}

/**
 * Objetos ya ubicados, en una grilla para revisar solo los cercanos. `marks` y `pass`
 * evitan revisar dos veces un objeto que cae en varias celdas, sin crear un Set por
 * consulta.
 */
interface Occupancy {
  shapes: Shape[];
  cells: Map<string, number[]>;
  marks: number[];
  pass: number;
}

function cellRange(shape: Shape, extra: number) {
  const reach = boundingRadius(shape) + extra;
  return {
    fromColumn: Math.floor((shape.x - reach) / OCCUPANCY_CELL),
    toColumn: Math.floor((shape.x + reach) / OCCUPANCY_CELL),
    fromRow: Math.floor((shape.z - reach) / OCCUPANCY_CELL),
    toRow: Math.floor((shape.z + reach) / OCCUPANCY_CELL),
  };
}

/** Si el área no pisa ningún objeto ya ubicado. Los neumáticos no se revisan entre sí. */
function isFree(occupancy: Occupancy, shape: Shape): boolean {
  const skipTyres = shape.type === 'circle' && shape.role === 'tyre';
  const range = cellRange(shape, OBJECT_MARGIN);
  occupancy.pass += 1;
  for (let column = range.fromColumn; column <= range.toColumn; column += 1) {
    for (let row = range.fromRow; row <= range.toRow; row += 1) {
      for (const index of occupancy.cells.get(`${column},${row}`) ?? []) {
        if (occupancy.marks[index] === occupancy.pass) {
          continue;
        }
        occupancy.marks[index] = occupancy.pass;
        const other = occupancy.shapes[index];
        if (skipTyres && other.type === 'circle' && other.role === 'tyre') {
          continue;
        }
        if (shapesTouch(shape, other)) {
          return false;
        }
      }
    }
  }
  return true;
}

function occupy(occupancy: Occupancy, shape: Shape): void {
  const index = occupancy.shapes.length;
  occupancy.shapes.push(shape);
  occupancy.marks.push(0);
  const range = cellRange(shape, 0);
  for (let column = range.fromColumn; column <= range.toColumn; column += 1) {
    for (let row = range.fromRow; row <= range.toRow; row += 1) {
      const key = `${column},${row}`;
      const list = occupancy.cells.get(key);
      if (list) {
        list.push(index);
      } else {
        occupancy.cells.set(key, [index]);
      }
    }
  }
}

function shapeOf(object: SceneryObject): Shape {
  if (isRoundObject(object.kind)) {
    return {
      type: 'circle',
      x: object.x,
      z: object.z,
      radius: object.length / 2,
      role: object.kind === 'bush' ? 'bush' : 'tree',
    };
  }
  return {
    type: 'rect',
    x: object.x,
    z: object.z,
    rotation: object.rotation,
    length: object.length,
    depth: object.depth,
  };
}

/** Ruido suave en el plano, de 0 a 1: decide dónde hay bosquecitos y dónde claros. */
function groveNoise(x: number, z: number, phases: number[]): number {
  const value =
    0.5 * Math.sin(x / 23 + phases[0]) * Math.sin(z / 19 + phases[1]) +
    0.3 * Math.sin((x + z) / 41 + phases[2]) +
    0.2 * Math.sin((x - z) / 29 + phases[3]);
  return 0.5 + 0.5 * value;
}

/** Rampa lineal de 0 (en `from` o menos) a 1 (en `to` o más). */
const ramp = (value: number, from: number, to: number) => clamp((value - from) / (to - from), 0, 1);

/**
 * Genera la escenografía de un circuito a partir de su trazado. Pura y determinista:
 * el mismo circuito con la misma `spec` da siempre la misma escenografía.
 *
 * - Carteles de distancia (300, 200, 100 m) antes de cada curva cerrada, del lado de
 *   afuera de la curva, si la recta de aproximación lo permite.
 * - Tribuna en el exterior de la recta principal, antes de la meta; carteles
 *   publicitarios en su interior y en las otras rectas largas.
 * - Barreras de neumáticos en el exterior de cada curva con pianos, al final de la
 *   escapatoria.
 * - Árboles y arbustos en bosquecitos, más allá de la escapatoria.
 * - Marcas de frenada antes de las curvas cerradas y parches sobre el asfalto.
 *
 * Ningún objeto entra en la zona libre (pista más escapatoria) de ningún tramo, ni pisa
 * otro objeto.
 */
export function generateScenery(
  circuit: Circuit,
  spec: ScenerySpec = DEFAULT_SCENERY_SPEC,
  config: SceneryConfig = DEFAULT_SCENERY_CONFIG,
): Scenery {
  let randomState = createRandomState(spec.seed);
  const random = () => {
    const result = nextRandom(randomState);
    randomState = result.state;
    return result.value;
  };
  const between = (min: number, max: number) => min + (max - min) * random();

  const lap = circuit.length;
  const clearance = createTrackClearance(circuit, config.runoff);
  const occupancy: Occupancy = { shapes: [], cells: new Map(), marks: [], pass: 0 };
  const objects: SceneryObject[] = [];
  const corners = getTightCorners(circuit, config.tightCornerRadius);
  const insideSide: TrackSide = getLapDirection(circuit);
  const outsideSide: TrackSide = insideSide === 1 ? -1 : 1;

  /** Ubica el objeto si queda fuera de la zona libre y no pisa a otro. */
  const tryPlace = (object: SceneryObject): boolean => {
    const shape = shapeOf(object);
    // Un rectángulo entra si entra el círculo que lo contiene; si no, se revisa su borde.
    const clear =
      fitsClearance(clearance, circuit, shape.x, shape.z, boundingRadius(shape)) ||
      (shape.type === 'rect' &&
        getObjectOutline(object).every((point) =>
          fitsClearance(clearance, circuit, point.x, point.z, 0),
        ));
    if (!clear || !isFree(occupancy, shape)) {
      return false;
    }
    occupy(occupancy, shape);
    objects.push({
      ...object,
      x: tidy(object.x),
      z: tidy(object.z),
      rotation: tidyAngle(object.rotation),
      length: tidy(object.length),
      depth: tidy(object.depth),
    });
    return true;
  };

  /**
   * Ubica un objeto rectangular al costado de la pista, pegado a la escapatoria, y lo
   * corre hacia afuera de a un metro si no entra.
   */
  const placeBeside = (
    kind: SceneryObjectKind,
    distance: number,
    side: TrackSide,
    size: RectSize,
    variant: number,
    rotationFor: (heading: Radians) => Radians,
    maxPush = MAX_SIGN_PUSH,
  ): boolean => {
    const sample = getPointAtDistance(circuit, distance);
    const base = getClearanceAt(clearance, circuit, distance, side) + size.depth / 2 + SIGN_GAP;
    for (let push = 0; push <= maxPush; push += 1) {
      const center = getSidePoint(sample, side, base + push);
      const placed = tryPlace({
        kind,
        x: center.x,
        z: center.z,
        rotation: rotationFor(sample.heading),
        length: size.length,
        depth: size.depth,
        variant,
      });
      if (placed) {
        return true;
      }
    }
    return false;
  };

  // Reserva el lugar del cartel META: afuera, justo después de la línea.
  const finish = getPointAtDistance(circuit, 0);
  const signCenter = getSidePoint(
    getPointAtDistance(circuit, FINISH_CLEAR / 2),
    outsideSide,
    getClearanceAt(clearance, circuit, 0, outsideSide),
  );
  occupy(occupancy, {
    type: 'rect',
    x: signCenter.x,
    z: signCenter.z,
    rotation: finish.heading - Math.PI / 2,
    length: FINISH_CLEAR + 4,
    depth: 8,
  });

  // Carteles de distancia: solo si la aproximación no tiene otra curva cerrada.
  const approachIsClear = (corner: TightCorner, from: number, span: number) =>
    corners.every(
      (other) =>
        other === corner ||
        (!isWithinSection(other.start, from, span, lap) &&
          !isWithinSection(other.start + other.length, from, span, lap)),
    );
  for (const corner of corners) {
    for (const distance of config.boardDistances) {
      const at = corner.start - distance;
      if (approachIsClear(corner, at, distance)) {
        placeBeside(
          'distanceBoard',
          at,
          corner.direction === 1 ? -1 : 1,
          DISTANCE_BOARD_SIZE,
          distance,
          getReadableRotation,
        );
      }
    }
  }

  // Tribuna: en el exterior de la recta principal, antes de la meta. Su eje y local
  // apunta hacia afuera de la pista.
  const main = getMainStraight(circuit);
  if (main) {
    const half = GRANDSTAND_SIZE.length / 2;
    let center = -config.grandstandBeforeFinish;
    const fits =
      isWithinSection(center - half, main.start, main.length, lap) &&
      isWithinSection(center + half, main.start, main.length, lap) &&
      main.length >= GRANDSTAND_SIZE.length;
    if (!fits) {
      center = main.start + main.length / 2;
    }
    placeBeside(
      'grandstand',
      center,
      outsideSide,
      GRANDSTAND_SIZE,
      0,
      (heading) => heading - outsideSide * (Math.PI / 2),
      10,
    );
  }

  // Publicidad: en el interior de la recta principal y en las otras rectas largas.
  const brandOffset = Math.floor(random() * BILLBOARD_BRANDS.length);
  let billboards = 0;
  const placeBillboard = (distance: number, side: TrackSide) => {
    const brand = (brandOffset + billboards) % BILLBOARD_BRANDS.length;
    if (placeBeside('billboard', distance, side, BILLBOARD_SIZE, brand, getReadableRotation, 2)) {
      billboards += 1;
    }
  };
  if (main) {
    for (let along = 30; along <= main.length - 30; along += config.billboardSpacing) {
      placeBillboard(main.start + along, insideSide);
    }
  }
  getStraights(circuit)
    .filter(
      (straight) =>
        straight.start !== main?.start && straight.length >= config.billboardMinStraight,
    )
    .forEach((straight) => {
      let count = 0;
      for (
        let along = 35;
        along <= straight.length - 35;
        along += config.straightBillboardSpacing
      ) {
        placeBillboard(straight.start + along, count % 2 === 0 ? outsideSide : insideSide);
        count += 1;
      }
    });

  // Barreras de neumáticos: una por cada tramo de curva que gira hacia el mismo lado,
  // del lado de afuera, a una distancia fija (la mayor zona libre del tramo).
  const tyres: TrackPoint[] = [];
  const tyreRadius = TYRE_DIAMETER / 2;
  for (const kerb of circuit.kerbs) {
    if (kerb.length >= lap) {
      continue;
    }
    // Tramos que giran hacia el mismo lado: en una chicana, el exterior cambia de lado.
    const runs: { start: number; end: number; sign: number; outside: TrackSide }[] = [];
    let lastSign = 0;
    for (let along = 0; along <= kerb.length; along += 1) {
      const curvature = getSignedCurvature(circuit, kerb.start + along);
      const sign = Math.abs(curvature) < STRAIGHT_CURVATURE ? lastSign : Math.sign(curvature);
      if (sign === 0) {
        continue;
      }
      const current = runs[runs.length - 1];
      if (current && current.sign === sign) {
        current.end = kerb.start + along;
      } else {
        const start = kerb.start + along;
        runs.push({ start, end: start, sign, outside: sign > 0 ? -1 : 1 });
      }
      lastSign = sign;
    }
    for (const run of runs.filter((item) => item.end - item.start >= MIN_BARRIER_RUN)) {
      const from = run.start - TYRE_EXTENSION;
      const to = run.end + TYRE_EXTENSION;
      let offset = 0;
      for (let along = from; along <= to; along += 1) {
        offset = Math.max(offset, getClearanceAt(clearance, circuit, along, run.outside));
      }
      for (let row = 0; row < TYRE_ROWS; row += 1) {
        // La fila es una línea paralela a la pista; los neumáticos van uno pegado al otro
        // a lo largo de ella. Donde no entran (otra parte de la pista, un cartel), se saltean.
        const rowOffset = offset + tyreRadius + 0.05 + row * TYRE_DIAMETER;
        const line: TrackPoint[] = [];
        for (let along = from; along <= to; along += TYRE_LINE_STEP) {
          line.push(getSidePoint(getPointAtDistance(circuit, along), run.outside, rowOffset));
        }
        let walked = 0;
        let nextAt = 0;
        for (let i = 1; i < line.length; i += 1) {
          const a = line[i - 1];
          const b = line[i];
          const span = Math.hypot(b.x - a.x, b.z - a.z);
          while (span > 0 && walked + span >= nextAt) {
            const t = (nextAt - walked) / span;
            const x = a.x + (b.x - a.x) * t;
            const z = a.z + (b.z - a.z) * t;
            const shape: Shape = { type: 'circle', x, z, radius: tyreRadius, role: 'tyre' };
            if (fitsClearance(clearance, circuit, x, z, tyreRadius) && isFree(occupancy, shape)) {
              occupy(occupancy, shape);
              tyres.push({ x: tidy(x), z: tidy(z) });
            }
            nextAt += TYRE_DIAMETER;
          }
          walked += span;
        }
      }
    }
  }

  // Árboles y arbustos: más tupidos cerca de la pista, en bosquecitos y claros.
  const phases = [0, 1, 2, 3].map(() => random() * Math.PI * 2);
  const placeVegetation = (
    attempts: number,
    band: number,
    pick: () => { kind: SceneryObjectKind; diameter: number },
    chance: (noise: number) => number,
  ) => {
    for (let i = 0; i < attempts; i += 1) {
      const distance = random() * lap;
      const side: TrackSide = random() < 0.5 ? -1 : 1;
      const { kind, diameter } = pick();
      const spread = random() ** 1.6;
      const keep = random();
      const variant = Math.floor(random() * 3);
      const sample = getPointAtDistance(circuit, distance);
      const offset =
        getClearanceAt(clearance, circuit, distance, side) + diameter / 2 + band * spread;
      const point = getSidePoint(sample, side, offset);
      if (keep < chance(groveNoise(point.x, point.z, phases))) {
        tryPlace({
          kind,
          x: point.x,
          z: point.z,
          rotation: 0,
          length: diameter,
          depth: diameter,
          variant,
        });
      }
    }
  };
  const density = Math.max(spec.treeDensity, 0);
  placeVegetation(
    Math.round((density * config.treesPerKm * lap) / 1000),
    config.treeBand,
    () => {
      const kind = random() < 0.55 ? 'treeLarge' : 'treeSmall';
      return { kind, diameter: between(VEGETATION_SIZES[kind].min, VEGETATION_SIZES[kind].max) };
    },
    (noise) => 0.06 + 0.94 * ramp(noise, 0.4, 0.7),
  );
  placeVegetation(
    Math.round((density * config.bushesPerKm * lap) / 1000),
    config.bushBand,
    () => ({
      kind: 'bush',
      diameter: between(VEGETATION_SIZES.bush.min, VEGETATION_SIZES.bush.max),
    }),
    (noise) => 0.15 + 0.85 * ramp(noise, 0.3, 0.6),
  );

  // Marcas de frenada: pares de líneas (las dos ruedas traseras) antes de cada curva cerrada.
  const halfWidth = circuit.width / 2;
  const skidMarks: TrackPoint[][] = [];
  for (const corner of corners) {
    const count = 4 + Math.floor(random() * 3);
    for (let k = 0; k < count; k += 1) {
      const lateral = between(-(halfWidth - 2), halfWidth - 2);
      const length = between(14, 40);
      const from =
        corner.start - config.skidZone + random() * Math.max(config.skidZone - length, 0);
      const phase = random() * Math.PI * 2;
      for (const wheel of [-SKID_WHEEL_OFFSET, SKID_WHEEL_OFFSET]) {
        const line: TrackPoint[] = [];
        for (let along = 0; along <= length; along += 2) {
          const sample = getPointAtDistance(circuit, from + along);
          const wobble = 0.15 * Math.sin(along * 0.3 + phase);
          const point = getSidePoint(sample, 1, lateral + wheel + wobble);
          line.push({ x: tidy(point.x), z: tidy(point.z) });
        }
        skidMarks.push(line);
      }
    }
  }

  // Parches: manchas alargadas sobre el asfalto, lejos de la meta y sin tocar los bordes.
  const patches: AsphaltPatch[] = [];
  const patchMargin = 0.3;
  for (
    let along = FINISH_CLEAR;
    along < lap - FINISH_CLEAR;
    along += config.patchSpacing * between(0.6, 1.4)
  ) {
    if (random() < 0.5) {
      continue;
    }
    const length = between(3, 9);
    const width = between(1.2, 3.2);
    const maxLateral = halfWidth - 0.5 - width / 2;
    const lateral = between(-maxLateral, maxLateral);
    const sample = getPointAtDistance(circuit, along);
    const center = getSidePoint(sample, 1, lateral);
    const angle = sample.heading + between(-0.15, 0.15);
    const forwardX = Math.sin(angle);
    const forwardZ = -Math.cos(angle);
    const points: TrackPoint[] = [];
    for (let v = 0; v < 10; v += 1) {
      const t = (v / 10) * Math.PI * 2;
      const alongPatch = Math.cos(t) * (length / 2) * between(0.85, 1.1);
      const across = Math.sin(t) * (width / 2) * between(0.85, 1.1);
      points.push({
        x: tidy(center.x + forwardX * alongPatch + Math.cos(angle) * across),
        z: tidy(center.z + forwardZ * alongPatch + Math.sin(angle) * across),
      });
    }
    const tone = random() < 0.5 ? 'light' : 'dark';
    const hint = getSegmentAtDistance(circuit, along);
    const inside = points.every(
      (point) =>
        getNearestOnCenterline(circuit, point.x, point.z, hint).distance <= halfWidth - patchMargin,
    );
    if (inside) {
      patches.push({ tone, points });
    }
  }

  return {
    spec: { ...spec },
    objects,
    tyres,
    skidMarks,
    patches,
    grassStripeAngle: getGrassStripeAngle(circuit),
  };
}

/**
 * El circuito con su escenografía generada de nuevo: con `spec`, o con la que ya
 * tenía (o la de por defecto). Sirve al cambiar el ancho o la densidad de árboles.
 */
export function withScenery(circuit: Circuit, spec?: ScenerySpec): Circuit {
  return {
    ...circuit,
    scenery: generateScenery(circuit, spec ?? circuit.scenery?.spec ?? DEFAULT_SCENERY_SPEC),
  };
}

/** La zona libre que usa el generador, para revisar la escenografía desde afuera. */
export function getSceneryClearance(
  circuit: Circuit,
  config: SceneryConfig = DEFAULT_SCENERY_CONFIG,
): TrackClearance {
  return createTrackClearance(circuit, config.runoff);
}
