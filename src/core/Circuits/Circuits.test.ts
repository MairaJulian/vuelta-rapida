import { DEFAULT_SCENERY_SPEC, generateScenery } from '@/core/Scenery';
import {
  getCurveSections,
  getLapDirection,
  getNearestOnCenterline,
  OVAL_CIRCUIT,
} from '@/core/Track';
import { validateCircuit } from '@/core/TrackValidation';

import {
  AUTODROMO_DEL_LAGO,
  buildCircuit,
  CIRCUIT_DEFINITIONS,
  CIRCUITS,
  DEFAULT_CIRCUIT,
  getCircuit,
  getCircuitSummary,
  TRACK_SPACING,
  withCircuitScenery,
} from './Circuits';

describe('CIRCUITS y getCircuit', () => {
  it('hay un circuito armado por definición, en el mismo orden', () => {
    expect(CIRCUITS.map((circuit) => circuit.id)).toEqual(
      CIRCUIT_DEFINITIONS.map((definition) => definition.id),
    );
    expect(CIRCUITS[0]).toBe(DEFAULT_CIRCUIT);
  });

  it('busca por id; si no existe, da el primero', () => {
    expect(getCircuit('autodromo-del-lago')).toBe(DEFAULT_CIRCUIT);
    expect(getCircuit('no-existe')).toBe(DEFAULT_CIRCUIT);
    expect(getCircuit(undefined)).toBe(DEFAULT_CIRCUIT);
  });

  it('resume largo y curvas como en el handoff', () => {
    const summary = getCircuitSummary(DEFAULT_CIRCUIT);
    expect(summary).toMatch(/^\d+,\d km · \d+ curvas$/);
    expect(summary).toContain(`${DEFAULT_CIRCUIT.kerbs.length} curvas`);
  });
});

describe('CIRCUIT_DEFINITIONS', () => {
  it.each(CIRCUIT_DEFINITIONS.map((definition) => [definition.name, definition] as const))(
    '%s es válido: cerrado, sin cruces, con tramos separados y curvas posibles',
    (_name, definition) => {
      expect(validateCircuit(buildCircuit(definition))).toEqual([]);
    },
  );

  it('los identificadores no se repiten', () => {
    const ids = CIRCUIT_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada circuito trae la semilla de su escenografía, con densidad normal', () => {
    for (const definition of CIRCUIT_DEFINITIONS) {
      expect(Number.isInteger(definition.scenery.seed)).toBe(true);
      expect(definition.scenery.treeDensity).toBe(1);
    }
  });
});

describe('withCircuitScenery', () => {
  it('DEFAULT_CIRCUIT no trae escenografía: se genera al abrir la carrera', () => {
    expect(DEFAULT_CIRCUIT.scenery).toBeUndefined();
  });

  it('suma la escenografía con la semilla de la definición, sin tocar el trazado', () => {
    const circuit = withCircuitScenery(DEFAULT_CIRCUIT);
    expect(circuit.scenery).toEqual(generateScenery(DEFAULT_CIRCUIT, AUTODROMO_DEL_LAGO.scenery));
    const { scenery: _scenery, ...geometry } = circuit;
    expect(geometry).toEqual(DEFAULT_CIRCUIT);
  });

  it('un circuito sin definición usa la escenografía por defecto', () => {
    expect(withCircuitScenery(OVAL_CIRCUIT).scenery?.spec).toEqual(DEFAULT_SCENERY_SPEC);
  });
});

describe('buildCircuit', () => {
  const circuit = buildCircuit(AUTODROMO_DEL_LAGO);

  it('el punto 0 es la meta, el primer punto de control', () => {
    expect(circuit.centerline[0]).toEqual(AUTODROMO_DEL_LAGO.controlPoints[0]);
    expect(circuit.distances[0]).toBe(0);
  });

  it('pasa por todos los puntos de control', () => {
    // Con puntos cada 2 m, en la curva más cerrada (11 m de radio) la cuerda se aparta unos 5 cm.
    for (const point of AUTODROMO_DEL_LAGO.controlPoints) {
      expect(getNearestOnCenterline(circuit, point.x, point.z).distance).toBeLessThan(0.1);
    }
  });

  it('tiene puntos parejos, cada unos 2 m, y la vuelta cierra al mismo paso', () => {
    const points = circuit.centerline;
    const steps = points.map((point, i) => {
      const next = points[(i + 1) % points.length];
      return Math.hypot(next.x - point.x, next.z - point.z);
    });
    for (const step of steps) {
      expect(step).toBeGreaterThan(TRACK_SPACING * 0.95);
      expect(step).toBeLessThan(TRACK_SPACING * 1.05);
    }
  });

  it('las distancias crecen punto a punto y suman el largo de la vuelta', () => {
    const { distances, length } = circuit;
    for (let i = 1; i < distances.length; i += 1) {
      expect(distances[i]).toBeGreaterThan(distances[i - 1]);
    }
    expect(length).toBeGreaterThan(distances.at(-1)!);
    expect(length - distances.at(-1)!).toBeLessThan(TRACK_SPACING * 1.05);
  });

  it('los puntos de control intermedios caen en los tercios de la vuelta', () => {
    expect(circuit.checkpoints).toHaveLength(2);
    expect(circuit.checkpoints[0]).toBeCloseTo(circuit.length / 3, 9);
    expect(circuit.checkpoints[1]).toBeCloseTo((2 * circuit.length) / 3, 9);
  });

  it('es serializable sin pérdidas', () => {
    expect(JSON.parse(JSON.stringify(circuit))).toEqual(circuit);
  });

  it('la búsqueda local del punto más cercano coincide con la completa en toda la vuelta', () => {
    const points = circuit.centerline;
    for (let i = 0; i < points.length; i += 7) {
      // A 6 m del centro (casi en el borde), hacia los dos lados.
      for (const side of [-6, 6]) {
        const x = points[i].x + side * 0.6;
        const z = points[i].z + side * 0.8;
        const full = getNearestOnCenterline(circuit, x, z);
        expect(getNearestOnCenterline(circuit, x, z, i)).toEqual(full);
      }
    }
  });

  it('es determinista: los mismos datos dan el mismo trazado', () => {
    expect(buildCircuit(AUTODROMO_DEL_LAGO)).toEqual(circuit);
  });
});

describe('AUTODROMO_DEL_LAGO', () => {
  it('mide unos 2,4 km y se corre en sentido antihorario', () => {
    expect(DEFAULT_CIRCUIT.length).toBeGreaterThan(2350);
    expect(DEFAULT_CIRCUIT.length).toBeLessThan(2500);
    expect(getLapDirection(DEFAULT_CIRCUIT)).toBe(-1);
  });

  it('la recta de la meta va hacia +x', () => {
    const [meta, next] = DEFAULT_CIRCUIT.centerline;
    expect(next.x).toBeGreaterThan(meta.x);
    expect(next.z).toBeCloseTo(meta.z, 6);
  });

  it('los pianos cubren las curvas sin partirse en pedacitos', () => {
    const sections = getCurveSections(DEFAULT_CIRCUIT);
    const lengths = sections.map((section) => (section.length - 1) * TRACK_SPACING);
    // Las seis curvas: la chicana es un solo piano, y no quedan tramos cortos sueltos.
    expect(sections).toHaveLength(6);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(50);
  });

  it('trae los seis pianos como datos, para pisarlos en la simulación', () => {
    expect(DEFAULT_CIRCUIT.kerbs).toHaveLength(6);
    DEFAULT_CIRCUIT.kerbs.forEach((kerb) => {
      expect(kerb.start).toBeGreaterThanOrEqual(0);
      expect(kerb.start).toBeLessThan(DEFAULT_CIRCUIT.length);
      expect(kerb.length).toBeGreaterThanOrEqual(50);
    });
  });

  it('es el circuito por defecto, de 14 m de ancho', () => {
    expect(DEFAULT_CIRCUIT.id).toBe('autodromo-del-lago');
    expect(DEFAULT_CIRCUIT.name).toBe('Autódromo del Lago');
    expect(DEFAULT_CIRCUIT.width).toBe(14);
  });
});
