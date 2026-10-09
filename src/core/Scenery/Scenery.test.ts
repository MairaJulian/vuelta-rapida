import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import {
  createCircuit,
  createOvalCenterline,
  getLapDirection,
  getNearestOnCenterline,
  getTrackProgress,
  KERB_WIDTH_RATIO,
  OVAL_CIRCUIT,
} from '@/core/Track';
import type { Circuit } from '@/core/Track';
import {
  getClearanceOverlap,
  getMainStraight,
  getPointAtDistance,
  getStraights,
  getTightCorners,
  isWithinSection,
} from '@/core/TrackFeatures';

import {
  BILLBOARD_BRANDS,
  DEFAULT_SCENERY_CONFIG,
  generateScenery,
  getGrassStripeAngle,
  getObjectOutline,
  getSceneryClearance,
  isRoundObject,
  TYRE_DIAMETER,
  withScenery,
} from './Scenery';
import type { Scenery, SceneryObject } from './Scenery.types';

/** Óvalo horario con rectas de `straight` metros, curvas de `radius` metros y 14 m de ancho. */
function oval(straight: number, radius: number): Circuit {
  return createCircuit({
    id: 'ovalo',
    name: 'Óvalo',
    centerline: createOvalCenterline({ straightLength: straight, radius, segmentsPerCurve: 120 }),
    width: 14,
    checkpointFractions: [1 / 3, 2 / 3],
  });
}

const SPEC = { seed: 7, treeDensity: 1 };
const autodromo = generateScenery(DEFAULT_CIRCUIT, SPEC);
const clearance = getSceneryClearance(DEFAULT_CIRCUIT);
const half = DEFAULT_CIRCUIT.width / 2;
/** Tolerancia por el redondeo a milímetros de los datos. */
const ROUNDING = 0.002;

const ofKind = (scenery: Scenery, kind: SceneryObject['kind']) =>
  scenery.objects.filter((object) => object.kind === kind);

/** Lado del trazado donde está un punto: 1 a la derecha del sentido de la marcha, -1 a la izquierda. */
function sideOf(circuit: Circuit, x: number, z: number): 1 | -1 {
  const progress = getTrackProgress(circuit, x, z);
  const sample = getPointAtDistance(circuit, progress);
  // Derecha del rumbo: (cos, sin); el producto escalar con ella dice el lado.
  const lateral =
    Math.cos(sample.heading) * (x - sample.x) + Math.sin(sample.heading) * (z - sample.z);
  return lateral >= 0 ? 1 : -1;
}

describe('generateScenery: nada invade la pista', () => {
  it('ningún objeto pisa la pista ni los pianos', () => {
    for (const object of autodromo.objects) {
      if (isRoundObject(object.kind)) {
        // Un círculo no toca la pista si su centro está a más de su radio del borde.
        const nearest = getNearestOnCenterline(DEFAULT_CIRCUIT, object.x, object.z);
        expect(nearest.distance - object.length / 2).toBeGreaterThan(half * KERB_WIDTH_RATIO);
      } else {
        for (const point of getObjectOutline(object)) {
          const nearest = getNearestOnCenterline(DEFAULT_CIRCUIT, point.x, point.z);
          expect(nearest.distance).toBeGreaterThan(half * KERB_WIDTH_RATIO);
        }
      }
    }
  });

  it('ningún objeto entra en la zona libre (pista más escapatoria) de ningún tramo', () => {
    for (const object of autodromo.objects) {
      if (isRoundObject(object.kind)) {
        const overlap = getClearanceOverlap(
          clearance,
          DEFAULT_CIRCUIT,
          object.x,
          object.z,
          object.length / 2,
        );
        expect(overlap).toBeLessThanOrEqual(ROUNDING);
      } else {
        for (const point of getObjectOutline(object)) {
          expect(
            getClearanceOverlap(clearance, DEFAULT_CIRCUIT, point.x, point.z, 0),
          ).toBeLessThanOrEqual(ROUNDING);
        }
      }
    }
  });

  it('los neumáticos de las barreras tampoco entran en la zona libre', () => {
    expect(autodromo.tyres.length).toBeGreaterThan(500);
    for (const tyre of autodromo.tyres) {
      expect(
        getClearanceOverlap(clearance, DEFAULT_CIRCUIT, tyre.x, tyre.z, TYRE_DIAMETER / 2),
      ).toBeLessThanOrEqual(ROUNDING);
    }
  });

  it('los objetos no se pisan entre sí (salvo las copas de los árboles, un poco)', () => {
    const solid = autodromo.objects.filter((object) => !isRoundObject(object.kind));
    for (const object of solid) {
      for (const other of autodromo.objects) {
        if (other === object || !isRoundObject(other.kind)) {
          continue;
        }
        // Ningún árbol ni arbusto tiene su centro dentro de un cartel o la tribuna.
        const dx = other.x - object.x;
        const dz = other.z - object.z;
        const localX = dx * Math.cos(object.rotation) + dz * Math.sin(object.rotation);
        const localY = -dx * Math.sin(object.rotation) + dz * Math.cos(object.rotation);
        const inside = Math.abs(localX) < object.length / 2 && Math.abs(localY) < object.depth / 2;
        expect(inside).toBe(false);
      }
    }
  });
});

describe('generateScenery: carteles de distancia', () => {
  const corners = getTightCorners(DEFAULT_CIRCUIT);
  const boards = ofKind(autodromo, 'distanceBoard');

  it('hay 300, 200 y 100 antes de cada curva cerrada del Autódromo', () => {
    expect(corners).toHaveLength(2);
    expect(boards).toHaveLength(corners.length * 3);
    for (const corner of corners) {
      for (const distance of DEFAULT_SCENERY_CONFIG.boardDistances) {
        const match = boards.find((board) => {
          const progress = getTrackProgress(DEFAULT_CIRCUIT, board.x, board.z);
          const before =
            (corner.start - progress + DEFAULT_CIRCUIT.length) % DEFAULT_CIRCUIT.length;
          return board.variant === distance && Math.abs(before - distance) < 2;
        });
        expect(match).toBeDefined();
      }
    }
  });

  it('van del lado de afuera de la curva que anuncian', () => {
    for (const corner of corners) {
      const outside = corner.direction === 1 ? -1 : 1;
      for (const board of boards) {
        const progress = getTrackProgress(DEFAULT_CIRCUIT, board.x, board.z);
        if (isWithinSection(progress, corner.start - 310, 310, DEFAULT_CIRCUIT.length)) {
          expect(sideOf(DEFAULT_CIRCUIT, board.x, board.z)).toBe(outside);
        }
      }
    }
  });

  it('no hay carteles si la recta no alcanza: en un óvalo corto solo entran los que caben', () => {
    // Rectas de 160 m: antes de cada curva solo caben los de 100 m.
    const short = oval(160, 30);
    const scenery = generateScenery(short, SPEC);
    const variants = ofKind(scenery, 'distanceBoard').map((board) => board.variant);
    expect(variants.sort()).toEqual([100, 100]);
  });

  it('en un óvalo largo con curvas cerradas hay tres carteles por curva', () => {
    const scenery = generateScenery(oval(400, 30), SPEC);
    const variants = ofKind(scenery, 'distanceBoard').map((board) => board.variant);
    expect(variants.sort((a, b) => a - b)).toEqual([100, 100, 200, 200, 300, 300]);
  });

  it('sin curvas cerradas no hay carteles ni marcas de frenada', () => {
    const scenery = generateScenery(OVAL_CIRCUIT, SPEC);
    expect(ofKind(scenery, 'distanceBoard')).toEqual([]);
    expect(scenery.skidMarks).toEqual([]);
  });
});

describe('generateScenery: tribuna, publicidad y barreras', () => {
  const main = getMainStraight(DEFAULT_CIRCUIT)!;
  const outside = -getLapDirection(DEFAULT_CIRCUIT);

  it('la tribuna está en el exterior de la recta principal, antes de la meta', () => {
    const [stand, ...others] = ofKind(autodromo, 'grandstand');
    expect(others).toEqual([]);
    const progress = getTrackProgress(DEFAULT_CIRCUIT, stand.x, stand.z);
    expect(isWithinSection(progress, main.start, main.length, DEFAULT_CIRCUIT.length)).toBe(true);
    expect(progress).toBeGreaterThan(DEFAULT_CIRCUIT.length - 60);
    expect(sideOf(DEFAULT_CIRCUIT, stand.x, stand.z)).toBe(outside);
    // Su eje y local apunta hacia afuera de la pista.
    const sample = getPointAtDistance(DEFAULT_CIRCUIT, progress);
    const awayX = -Math.sin(stand.rotation);
    const awayZ = Math.cos(stand.rotation);
    const towardStandX = stand.x - sample.x;
    const towardStandZ = stand.z - sample.z;
    expect(awayX * towardStandX + awayZ * towardStandZ).toBeGreaterThan(0);
  });

  it('la publicidad usa solo marcas inventadas y está en la recta principal y en las largas', () => {
    const billboards = ofKind(autodromo, 'billboard');
    expect(billboards.length).toBeGreaterThan(10);
    const longStraights = getStraights(DEFAULT_CIRCUIT).filter(
      (straight) => straight.length >= DEFAULT_SCENERY_CONFIG.billboardMinStraight,
    );
    for (const billboard of billboards) {
      expect(BILLBOARD_BRANDS[billboard.variant]).toBeDefined();
      const progress = getTrackProgress(DEFAULT_CIRCUIT, billboard.x, billboard.z);
      const onStraight = longStraights.some((straight) =>
        isWithinSection(progress, straight.start, straight.length, DEFAULT_CIRCUIT.length),
      );
      expect(onStraight).toBe(true);
    }
    // En la recta principal van del lado de adentro.
    const onMain = billboards.filter((billboard) =>
      isWithinSection(
        getTrackProgress(DEFAULT_CIRCUIT, billboard.x, billboard.z),
        main.start,
        main.length,
        DEFAULT_CIRCUIT.length,
      ),
    );
    expect(onMain.length).toBeGreaterThan(5);
    onMain.forEach((billboard) =>
      expect(sideOf(DEFAULT_CIRCUIT, billboard.x, billboard.z)).toBe(-outside),
    );
  });

  it('las barreras de neumáticos están en las curvas, del lado de afuera', () => {
    const { kerbs, length } = DEFAULT_CIRCUIT;
    for (const tyre of autodromo.tyres) {
      const progress = getTrackProgress(DEFAULT_CIRCUIT, tyre.x, tyre.z);
      // En un piano, o a pocos metros de sus puntas (la barrera sigue un poco más).
      const nearKerb = kerbs.some((kerb) =>
        isWithinSection(progress, kerb.start - 10, kerb.length + 20, length),
      );
      expect(nearKerb).toBe(true);
    }
    // En la horquilla (gira a la derecha), la barrera queda a la izquierda.
    const hairpin = getTightCorners(DEFAULT_CIRCUIT)[1];
    const apex = hairpin.start + hairpin.length / 2;
    const atApex = autodromo.tyres.filter((tyre) =>
      isWithinSection(getTrackProgress(DEFAULT_CIRCUIT, tyre.x, tyre.z), apex - 5, 10, length),
    );
    expect(atApex.length).toBeGreaterThan(0);
    atApex.forEach((tyre) => expect(sideOf(DEFAULT_CIRCUIT, tyre.x, tyre.z)).toBe(-1));
  });
});

describe('generateScenery: árboles y arbustos', () => {
  it('hay árboles grandes, chicos y arbustos, con tres tonos', () => {
    expect(ofKind(autodromo, 'treeLarge').length).toBeGreaterThan(100);
    expect(ofKind(autodromo, 'treeSmall').length).toBeGreaterThan(100);
    expect(ofKind(autodromo, 'bush').length).toBeGreaterThan(100);
    const tones = new Set(ofKind(autodromo, 'treeLarge').map((tree) => tree.variant));
    expect([...tones].sort()).toEqual([0, 1, 2]);
  });

  it('la densidad cambia la cantidad: 0 ninguno, 2 más que 1', () => {
    const vegetation = (scenery: Scenery) =>
      scenery.objects.filter((object) => isRoundObject(object.kind)).length;
    const none = generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 0 });
    const double = generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 2 });
    expect(vegetation(none)).toBe(0);
    expect(vegetation(double)).toBeGreaterThan(vegetation(autodromo) * 1.3);
    // Los carteles y la tribuna no dependen de la densidad.
    expect(ofKind(none, 'distanceBoard')).toEqual(ofKind(autodromo, 'distanceBoard'));
    expect(ofKind(none, 'grandstand')).toEqual(ofKind(autodromo, 'grandstand'));
  });

  it('quedan cerca de la pista, donde la cámara los ve', () => {
    const reach = clearance.maxClearance + DEFAULT_SCENERY_CONFIG.treeBand + 4;
    for (const tree of ofKind(autodromo, 'treeLarge')) {
      expect(getNearestOnCenterline(DEFAULT_CIRCUIT, tree.x, tree.z).distance).toBeLessThan(reach);
    }
  });
});

describe('generateScenery: detalles del asfalto', () => {
  const corners = getTightCorners(DEFAULT_CIRCUIT);

  it('las marcas de frenada van sobre el asfalto, antes de las curvas cerradas', () => {
    expect(autodromo.skidMarks.length).toBeGreaterThan(0);
    for (const mark of autodromo.skidMarks) {
      expect(mark.length).toBeGreaterThan(5);
      for (const point of mark) {
        expect(getNearestOnCenterline(DEFAULT_CIRCUIT, point.x, point.z).distance).toBeLessThan(
          half - 0.5,
        );
      }
      const progress = getTrackProgress(DEFAULT_CIRCUIT, mark[0].x, mark[0].z);
      const beforeCorner = corners.some((corner) =>
        isWithinSection(
          progress,
          corner.start - DEFAULT_SCENERY_CONFIG.skidZone - 1,
          DEFAULT_SCENERY_CONFIG.skidZone + 2,
          DEFAULT_CIRCUIT.length,
        ),
      );
      expect(beforeCorner).toBe(true);
    }
  });

  it('los parches quedan dentro del asfalto y lejos de la meta', () => {
    expect(autodromo.patches.length).toBeGreaterThan(20);
    expect(new Set(autodromo.patches.map((patch) => patch.tone))).toEqual(
      new Set(['light', 'dark']),
    );
    for (const patch of autodromo.patches) {
      expect(patch.points.length).toBeGreaterThanOrEqual(8);
      for (const point of patch.points) {
        expect(getNearestOnCenterline(DEFAULT_CIRCUIT, point.x, point.z).distance).toBeLessThan(
          half,
        );
        const progress = getTrackProgress(DEFAULT_CIRCUIT, point.x, point.z);
        expect(isWithinSection(progress, -8, 16, DEFAULT_CIRCUIT.length)).toBe(false);
      }
    }
  });
});

describe('generateScenery: determinismo y datos', () => {
  it('la misma semilla da la misma escenografía', () => {
    expect(generateScenery(DEFAULT_CIRCUIT, SPEC)).toEqual(autodromo);
  });

  it('otra semilla da otra escenografía, con los mismos carteles de distancia', () => {
    const other = generateScenery(DEFAULT_CIRCUIT, { seed: 8, treeDensity: 1 });
    expect(other.objects).not.toEqual(autodromo.objects);
    expect(ofKind(other, 'distanceBoard')).toEqual(ofKind(autodromo, 'distanceBoard'));
  });

  it('es serializable sin pérdidas y guarda su spec', () => {
    expect(JSON.parse(JSON.stringify(autodromo))).toEqual(autodromo);
    expect(autodromo.spec).toEqual(SPEC);
  });

  it('withScenery la agrega al circuito y conserva la spec al regenerar', () => {
    const circuit = withScenery(DEFAULT_CIRCUIT, SPEC);
    expect(circuit.scenery).toEqual(autodromo);
    const wider = withScenery({ ...circuit, width: 18 });
    expect(wider.scenery?.spec).toEqual(SPEC);
    // Con la pista más ancha, la escenografía se aleja.
    const tree = ofKind(wider.scenery!, 'treeLarge')[0];
    expect(getNearestOnCenterline(wider, tree.x, tree.z).distance).toBeGreaterThan(9 + 3);
  });
});

describe('getGrassStripeAngle', () => {
  it('en un óvalo, las franjas cruzan las rectas en ángulo recto', () => {
    expect(getGrassStripeAngle(OVAL_CIRCUIT)).toBeCloseTo(0, 9);
  });

  it('en el Autódromo no corren paralelas a ninguna recta larga', () => {
    const angle = getGrassStripeAngle(DEFAULT_CIRCUIT);
    expect(autodromo.grassStripeAngle).toBe(angle);
    for (const straight of getStraights(DEFAULT_CIRCUIT).filter((item) => item.length >= 80)) {
      expect(Math.abs(Math.sin(angle - straight.heading))).toBeGreaterThan(0.5);
    }
  });
});

describe('getObjectOutline', () => {
  it('recorre el borde de un rectángulo girado, más el centro', () => {
    const outline = getObjectOutline(
      { kind: 'billboard', x: 10, z: 0, rotation: Math.PI / 2, length: 4, depth: 2, variant: 0 },
      1,
    );
    // Centro + 4 + 2 + 4 + 2 puntos.
    expect(outline).toHaveLength(13);
    const xs = outline.map((point) => point.x);
    const zs = outline.map((point) => point.z);
    // Girado 90°: el largo queda sobre z.
    expect(Math.max(...zs)).toBeCloseTo(2, 9);
    expect(Math.max(...xs)).toBeCloseTo(11, 9);
  });

  it('en árboles es un círculo', () => {
    const outline = getObjectOutline({
      kind: 'treeLarge',
      x: 0,
      z: 0,
      rotation: 0,
      length: 6,
      depth: 6,
      variant: 0,
    });
    outline.slice(1).forEach((point) => expect(Math.hypot(point.x, point.z)).toBeCloseTo(3, 9));
  });
});
