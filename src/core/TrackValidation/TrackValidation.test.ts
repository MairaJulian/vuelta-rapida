import { createCircuit, createOvalTrack, OVAL_CIRCUIT, OVAL_TRACK } from '@/core/Track';
import type { TrackData, TrackPoint } from '@/core/Track';

import { validateCircuit, validateTrack } from './TrackValidation';
import type { TrackIssue } from './TrackValidation.types';

const kinds = (issues: TrackIssue[]) => issues.map((issue) => issue.kind);

/** Polígono regular de `count` puntos y radio `radius`, centrado en el origen. */
function ring(count: number, radius: number, centerX = 0): TrackPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    x: centerX + radius * Math.cos((2 * Math.PI * i) / count),
    z: radius * Math.sin((2 * Math.PI * i) / count),
  }));
}

describe('validateTrack', () => {
  it('el óvalo de prueba es válido', () => {
    expect(validateTrack(OVAL_TRACK)).toEqual([]);
  });

  it('un círculo amplio es válido', () => {
    expect(validateTrack({ centerline: ring(120, 100), width: 14 })).toEqual([]);
  });

  it('detecta un trazado que se cruza consigo mismo (un ocho)', () => {
    // Dos círculos tangentes recorridos en sentidos opuestos: la vuelta pasa dos veces por el centro.
    const left = ring(60, 100, -100);
    const right = ring(60, 100, 100).map((point) => ({ x: point.x, z: -point.z }));
    const figureEight: TrackData = {
      centerline: [...left.slice(1), ...right.slice(31), ...right.slice(0, 31)],
      width: 10,
    };
    expect(kinds(validateTrack(figureEight))).toContain('self-crossing');
  });

  it('detecta dos tramos distintos demasiado cerca', () => {
    // Una U larga y angosta: las dos ramas van a 20 m, menos de dos anchos de 14 m.
    const centerline: TrackPoint[] = [];
    for (let x = 0; x <= 300; x += 5) centerline.push({ x, z: 0 });
    for (let a = 1; a < 20; a += 1) {
      const angle = -Math.PI / 2 + (Math.PI * a) / 20;
      centerline.push({ x: 300 + 10 * Math.cos(angle), z: 10 + 10 * Math.sin(angle) });
    }
    for (let x = 300; x >= 0; x -= 5) centerline.push({ x, z: 20 });
    for (let a = 1; a < 20; a += 1) {
      const angle = Math.PI / 2 + (Math.PI * a) / 20;
      centerline.push({ x: 10 * Math.cos(angle), z: 10 + 10 * Math.sin(angle) });
    }
    const issues = validateTrack({ centerline, width: 14 });
    const close = issues.find((issue) => issue.kind === 'sections-too-close');
    expect(close).toMatchObject({ distance: expect.closeTo(20, 6) });
    // Con una pista angosta, la misma U es válida.
    expect(validateTrack({ centerline, width: 8 })).toEqual([]);
  });

  it('detecta una curva tan cerrada que el borde interior se pliega', () => {
    // Un círculo de 6 m de radio con una pista de 14 m: el borde interior tendría radio negativo.
    const issues = validateTrack({ centerline: ring(30, 6), width: 14 });
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'curve-too-tight', radius: expect.closeTo(6, 0) }),
    );
  });

  it('cuenta el piano: una curva apenas más abierta que medio ancho también es inválida', () => {
    // 8 m de radio con 14 m de ancho: el asfalto entra, pero el piano (hasta 8,8 m) no.
    const issues = validateTrack({ centerline: ring(40, 8), width: 14 });
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'curve-too-tight' }));
    expect(validateTrack({ centerline: ring(40, 8), width: 12 })).not.toContainEqual(
      expect.objectContaining({ kind: 'curve-too-tight' }),
    );
  });

  it('detecta una vuelta abierta: el tramo que cierra es el más largo', () => {
    const line: TrackData = {
      centerline: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 20, z: 1 },
        { x: 30, z: 0 },
      ],
      width: 1,
    };
    expect(kinds(validateTrack(line))).toContain('not-closed');
  });

  it('detecta puntos repetidos, datos no finitos y trazados demasiado cortos', () => {
    const repeated = createOvalTrack({
      straightLength: 100,
      radius: 50,
      width: 10,
      segmentsPerCurve: 8,
    });
    repeated.centerline.splice(3, 0, { ...repeated.centerline[3] });
    expect(validateTrack(repeated)).toContainEqual({ kind: 'repeated-point', index: 4 });

    expect(validateTrack({ ...OVAL_TRACK, width: Number.NaN })).toEqual([{ kind: 'not-finite' }]);
    expect(validateTrack({ ...OVAL_TRACK, width: 0 })).toEqual([{ kind: 'not-finite' }]);
    const broken = OVAL_TRACK.centerline.map((point, i) =>
      i === 5 ? { x: Number.POSITIVE_INFINITY, z: point.z } : point,
    );
    expect(validateTrack({ centerline: broken, width: 14 })).toEqual([{ kind: 'not-finite' }]);

    expect(
      validateTrack({
        centerline: [
          { x: 0, z: 0 },
          { x: 1, z: 0 },
        ],
        width: 1,
      }),
    ).toEqual([{ kind: 'too-few-points', count: 2 }]);
  });
});

describe('validateCircuit', () => {
  it('el óvalo de prueba, con sus puntos de control, es válido', () => {
    expect(validateCircuit(OVAL_CIRCUIT)).toEqual([]);
  });

  it('detecta puntos de control fuera de orden o fuera de la vuelta', () => {
    const spec = { id: 'x', name: 'X', centerline: OVAL_TRACK.centerline, width: 14 };
    for (const checkpointFractions of [
      [2 / 3, 1 / 3],
      [0, 0.5],
      [0.5, 1.2],
    ]) {
      const circuit = createCircuit({ ...spec, checkpointFractions });
      expect(kinds(validateCircuit(circuit))).toEqual(['checkpoints-out-of-order']);
    }
  });
});
