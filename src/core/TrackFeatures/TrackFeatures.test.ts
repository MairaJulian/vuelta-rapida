import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import {
  createCircuit,
  createOvalCenterline,
  EDGE_WIDTH_RATIO,
  getNearestOnCenterline,
  KERB_WIDTH_RATIO,
  OVAL_CIRCUIT,
} from '@/core/Track';
import type { Circuit } from '@/core/Track';

import {
  createTrackClearance,
  DEFAULT_RUNOFF,
  fitsClearance,
  getClearanceAt,
  getClearanceOverlap,
  getMainStraight,
  getPointAtDistance,
  getReadableRotation,
  getSegmentAtDistance,
  getSidePoint,
  getSignedCurvature,
  getStraights,
  getTightCorners,
  isWithinSection,
} from './TrackFeatures';

/** Óvalo horario con rectas de `straight` metros y curvas de `radius` metros. */
function oval(straight: number, radius: number): Circuit {
  return createCircuit({
    id: 'ovalo',
    name: 'Óvalo',
    centerline: createOvalCenterline({ straightLength: straight, radius, segmentsPerCurve: 200 }),
    width: 14,
    checkpointFractions: [1 / 3, 2 / 3],
  });
}

describe('getPointAtDistance', () => {
  it('interpola sobre el trazado desde la meta, con el rumbo del tramo', () => {
    // El óvalo de prueba empieza en (0, -50) yendo hacia +x (rumbo π/2).
    const sample = getPointAtDistance(OVAL_CIRCUIT, 40);
    expect(sample.x).toBeCloseTo(40, 6);
    expect(sample.z).toBeCloseTo(-50, 6);
    expect(sample.heading).toBeCloseTo(Math.PI / 2, 9);
    expect(sample.distance).toBeCloseTo(40, 9);
  });

  it('da la vuelta: distancias negativas o mayores que la vuelta', () => {
    const length = OVAL_CIRCUIT.length;
    expect(getPointAtDistance(OVAL_CIRCUIT, -10).distance).toBeCloseTo(length - 10, 6);
    expect(getPointAtDistance(OVAL_CIRCUIT, length + 5).x).toBeCloseTo(5, 6);
  });

  it('getSegmentAtDistance devuelve el tramo que contiene la distancia', () => {
    const { distances } = DEFAULT_CIRCUIT;
    expect(getSegmentAtDistance(DEFAULT_CIRCUIT, 0)).toBe(0);
    expect(getSegmentAtDistance(DEFAULT_CIRCUIT, distances[10] + 0.1)).toBe(10);
    expect(getSegmentAtDistance(DEFAULT_CIRCUIT, DEFAULT_CIRCUIT.length - 0.1)).toBe(
      distances.length - 1,
    );
  });
});

describe('getSignedCurvature', () => {
  it('es cero en las rectas y 1/radio en las curvas, positiva en sentido horario', () => {
    expect(getSignedCurvature(OVAL_CIRCUIT, 40)).toBeCloseTo(0, 9);
    // Mitad de la primera curva: 100 m de recta más un cuarto de la curva de 50 m. El
    // óvalo de prueba aproxima cada curva con 32 tramos de casi 5 m: el valor oscila un poco.
    const middle = 100 + (Math.PI * 50) / 2;
    expect(getSignedCurvature(OVAL_CIRCUIT, middle)).toBeGreaterThan(0.9 / 50);
    expect(getSignedCurvature(OVAL_CIRCUIT, middle)).toBeLessThan(1.1 / 50);
    // Con un trazado fino, es 1/radio.
    expect(getSignedCurvature(oval(200, 50), 100 + (Math.PI * 50) / 2)).toBeCloseTo(1 / 50, 3);
  });
});

describe('getTightCorners', () => {
  it('no encuentra curvas cerradas en un óvalo de 50 m de radio', () => {
    expect(getTightCorners(OVAL_CIRCUIT)).toEqual([]);
  });

  it('encuentra las dos curvas de un óvalo cerrado, con su entrada y su sentido', () => {
    const track = oval(400, 30);
    const corners = getTightCorners(track);
    expect(corners).toHaveLength(2);
    // La primera curva empieza al final de la media recta (200 m); la curvatura se mide
    // con una ventana de 8 m, así que la entrada se detecta unos metros después.
    expect(corners[0].start).toBeGreaterThan(195);
    expect(corners[0].start).toBeLessThan(210);
    expect(corners[0].direction).toBe(1);
    expect(corners[0].minRadius).toBeGreaterThan(29);
    expect(corners[0].minRadius).toBeLessThan(31);
    expect(corners[0].length).toBeGreaterThan(Math.PI * 30 * 0.9);
  });

  it('en el Autódromo del Lago son la chicana y la horquilla', () => {
    const corners = getTightCorners(DEFAULT_CIRCUIT);
    expect(corners).toHaveLength(2);
    const [chicane, hairpin] = corners;
    // La chicana empieza a la derecha al final de la recta principal.
    expect(chicane.start).toBeGreaterThan(230);
    expect(chicane.start).toBeLessThan(260);
    expect(chicane.direction).toBe(1);
    // Las dos mitades de la chicana son una sola curva.
    expect(chicane.length).toBeGreaterThan(80);
    expect(hairpin.start).toBeGreaterThan(1300);
    expect(hairpin.start).toBeLessThan(1350);
    expect(hairpin.minRadius).toBeLessThan(20);
  });
});

describe('getStraights y getMainStraight', () => {
  it('en el óvalo hay dos rectas, una en cada sentido', () => {
    const straights = getStraights(OVAL_CIRCUIT);
    expect(straights).toHaveLength(2);
    expect(Math.abs(straights[0].heading)).toBeCloseTo(Math.PI / 2, 1);
    expect(Math.abs(straights[1].heading)).toBeCloseTo(Math.PI / 2, 1);
    expect(Math.sign(straights[0].heading)).not.toBe(Math.sign(straights[1].heading));
  });

  it('la recta principal del Autódromo contiene la meta y va hacia +x', () => {
    const main = getMainStraight(DEFAULT_CIRCUIT)!;
    expect(isWithinSection(0, main.start, main.length, DEFAULT_CIRCUIT.length)).toBe(true);
    expect(main.length).toBeGreaterThan(400);
    expect(main.heading).toBeCloseTo(Math.PI / 2, 1);
  });

  it('isWithinSection respeta la vuelta', () => {
    expect(isWithinSection(5, 990, 30, 1000)).toBe(true);
    expect(isWithinSection(25, 990, 30, 1000)).toBe(false);
    expect(isWithinSection(995, 990, 30, 1000)).toBe(true);
  });
});

describe('getSidePoint y getReadableRotation', () => {
  it('la derecha de un auto que va hacia +x es +z', () => {
    const sample = { x: 0, z: 0, heading: Math.PI / 2, distance: 0 };
    const right = getSidePoint(sample, 1, 10);
    expect(right.x).toBeCloseTo(0, 9);
    expect(right.z).toBeCloseTo(10, 9);
    expect(getSidePoint(sample, -1, 10).z).toBeCloseTo(-10, 9);
  });

  it('el giro sigue a la pista y nunca deja el texto cabeza abajo', () => {
    expect(getReadableRotation(Math.PI / 2)).toBeCloseTo(0, 9);
    expect(getReadableRotation(-Math.PI / 2)).toBeCloseTo(0, 9);
    for (let heading = -Math.PI; heading <= Math.PI; heading += 0.1) {
      const rotation = getReadableRotation(heading);
      expect(rotation).toBeGreaterThan(-Math.PI / 2 - 1e-9);
      expect(rotation).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
      // El eje del objeto sigue al rumbo (o al rumbo opuesto).
      expect(Math.abs(Math.sin(rotation - (heading - Math.PI / 2)))).toBeCloseTo(0, 9);
    }
  });
});

describe('zona libre', () => {
  const clearance = createTrackClearance(OVAL_CIRCUIT, DEFAULT_RUNOFF);
  const half = OVAL_CIRCUIT.width / 2;

  it('en las rectas: borde blanco más la escapatoria, de los dos lados', () => {
    expect(getClearanceAt(clearance, OVAL_CIRCUIT, 40, 1)).toBeCloseTo(
      half * EDGE_WIDTH_RATIO + DEFAULT_RUNOFF.straightRunoff,
      9,
    );
    expect(getClearanceAt(clearance, OVAL_CIRCUIT, 40, -1)).toBeCloseTo(
      half * EDGE_WIDTH_RATIO + DEFAULT_RUNOFF.straightRunoff,
      9,
    );
  });

  it('en las curvas: piano más escapatoria grande afuera y chica adentro', () => {
    const middle = 100 + (Math.PI * 50) / 2;
    // El óvalo es horario: la curva gira a la derecha y el exterior queda a la izquierda.
    expect(getClearanceAt(clearance, OVAL_CIRCUIT, middle, -1)).toBeCloseTo(
      half * KERB_WIDTH_RATIO + DEFAULT_RUNOFF.curveRunoff,
      9,
    );
    expect(getClearanceAt(clearance, OVAL_CIRCUIT, middle, 1)).toBeCloseTo(
      half * KERB_WIDTH_RATIO + DEFAULT_RUNOFF.straightRunoff,
      9,
    );
  });

  it('un punto sobre la pista no entra; uno lejos sí', () => {
    expect(fitsClearance(clearance, OVAL_CIRCUIT, 0, -50, 0)).toBe(false);
    expect(fitsClearance(clearance, OVAL_CIRCUIT, 0, -200, 1)).toBe(true);
    expect(getClearanceOverlap(clearance, OVAL_CIRCUIT, 0, -50, 0)).toBeGreaterThan(0);
  });

  it('el borde de la zona libre en la recta está a la distancia esperada', () => {
    const edge = half * EDGE_WIDTH_RATIO + DEFAULT_RUNOFF.straightRunoff;
    // Arriba de la recta superior (z = -50), hacia afuera del óvalo.
    expect(fitsClearance(clearance, OVAL_CIRCUIT, 0, -50 - edge - 0.01, 0)).toBe(true);
    expect(fitsClearance(clearance, OVAL_CIRCUIT, 0, -50 - edge + 0.01, 0)).toBe(false);
    expect(getClearanceOverlap(clearance, OVAL_CIRCUIT, 0, -50 - edge - 1, 0)).toBeCloseTo(-1, 6);
  });

  it('fitsClearance coincide con getClearanceOverlap en todo el Autódromo', () => {
    const full = createTrackClearance(DEFAULT_CIRCUIT, DEFAULT_RUNOFF);
    for (let i = 0; i < 400; i += 1) {
      // Puntos en una espiral alrededor del trazado, a distintas distancias.
      const sample = getPointAtDistance(DEFAULT_CIRCUIT, i * 6.1);
      const point = getSidePoint(sample, i % 2 === 0 ? 1 : -1, (i % 37) * 0.8);
      const overlap = getClearanceOverlap(full, DEFAULT_CIRCUIT, point.x, point.z, 1);
      expect(fitsClearance(full, DEFAULT_CIRCUIT, point.x, point.z, 1)).toBe(overlap <= 0);
    }
  });

  it('respeta la zona libre de todos los tramos cercanos, no solo la del más próximo', () => {
    const full = createTrackClearance(DEFAULT_CIRCUIT, DEFAULT_RUNOFF);
    const { cellSize, cells, maxClearance } = full;
    expect(cellSize).toBeGreaterThan(0);
    expect(Object.keys(cells).length).toBeGreaterThan(0);
    // Un punto que entra según la grilla está, de verdad, fuera de la pista.
    for (let i = 0; i < 200; i += 1) {
      const sample = getPointAtDistance(DEFAULT_CIRCUIT, i * 12.3);
      const point = getSidePoint(sample, 1, maxClearance + 0.5);
      if (fitsClearance(full, DEFAULT_CIRCUIT, point.x, point.z, 0)) {
        const nearest = getNearestOnCenterline(DEFAULT_CIRCUIT, point.x, point.z);
        expect(nearest.distance).toBeGreaterThan(half * KERB_WIDTH_RATIO);
      }
    }
  });
});
