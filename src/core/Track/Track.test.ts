import { createCarState, DEFAULT_DRIVING_CONFIG, stepCar } from '@/core/DrivingModel';

import {
  createCircuit,
  createOvalCenterline,
  createOvalTrack,
  getCurveSections,
  getFinishLine,
  getFinishSign,
  getLapDirection,
  getNearestOnCenterline,
  getProgressDelta,
  getStartPose,
  getTrackProgress,
  OVAL_CIRCUIT,
  OVAL_TRACK,
} from './Track';
import type { TrackData, TrackPoint } from './Track.types';

const track = OVAL_TRACK;
const points = track.centerline;

function lapLength(centerline: TrackPoint[]): number {
  return centerline.reduce((total, point, i) => {
    const next = centerline[(i + 1) % centerline.length];
    return total + Math.hypot(next.x - point.x, next.z - point.z);
  }, 0);
}

describe('createOvalCenterline', () => {
  it('empieza en el centro de la recta superior y tiene dos semicírculos', () => {
    const centerline = createOvalCenterline({
      straightLength: 200,
      radius: 50,
      segmentsPerCurve: 8,
    });
    // Punto de meta y 9 puntos por curva.
    expect(centerline).toHaveLength(1 + 9 + 9);
    expect(centerline[0]).toEqual({ x: 0, z: -50 });
    // Curva derecha: de arriba hacia abajo pasando por el extremo derecho.
    expect(centerline[1]).toEqual({ x: 100, z: -50 });
    expect(centerline[5]).toEqual({ x: 150, z: 0 });
    expect(centerline[9]).toEqual({ x: 100, z: 50 });
    // Curva izquierda: de abajo hacia arriba pasando por el extremo izquierdo.
    expect(centerline[10]).toEqual({ x: -100, z: 50 });
    expect(centerline[14]).toEqual({ x: -150, z: 0 });
    expect(centerline[18]).toEqual({ x: -100, z: -50 });
  });

  it('los puntos de cada curva están a la distancia del radio', () => {
    const curvePoints = points.slice(1);
    for (const point of curvePoints) {
      const centerX = point.x > 0 ? 100 : -100;
      expect(Math.hypot(point.x - centerX, point.z)).toBeCloseTo(50, 6);
    }
  });

  it('la vuelta mide casi lo mismo que el estadio ideal', () => {
    const ideal = 2 * 200 + 2 * Math.PI * 50;
    expect(lapLength(points)).toBeLessThan(ideal);
    expect(lapLength(points)).toBeGreaterThan(ideal - 0.5);
  });
});

describe('createCircuit y OVAL_CIRCUIT', () => {
  it('mide la distancia desde la meta hasta cada punto y el largo de la vuelta', () => {
    expect(OVAL_CIRCUIT.distances).toHaveLength(points.length);
    expect(OVAL_CIRCUIT.distances[0]).toBe(0);
    expect(OVAL_CIRCUIT.distances[1]).toBe(100);
    expect(OVAL_CIRCUIT.length).toBeCloseTo(lapLength(points), 9);
  });

  it('ubica los puntos de control según la fracción de la vuelta', () => {
    expect(OVAL_CIRCUIT.checkpoints).toEqual([
      OVAL_CIRCUIT.length / 3,
      (2 * OVAL_CIRCUIT.length) / 3,
    ]);
  });

  it('conserva el trazado y el ancho', () => {
    expect(OVAL_CIRCUIT.centerline).toBe(OVAL_TRACK.centerline);
    expect(OVAL_CIRCUIT.width).toBe(14);
  });
});

describe('getTrackProgress', () => {
  it('es la distancia desde la meta por el trazado', () => {
    expect(getTrackProgress(OVAL_CIRCUIT, 0, -50)).toBe(0);
    expect(getTrackProgress(OVAL_CIRCUIT, 30, -50)).toBeCloseTo(30, 9);
    // Desplazarse a lo ancho de la pista no cambia el progreso.
    expect(getTrackProgress(OVAL_CIRCUIT, 30, -44)).toBeCloseTo(30, 9);
    // En el tramo que cierra la vuelta, justo antes de la meta.
    expect(getTrackProgress(OVAL_CIRCUIT, -10, -50)).toBeCloseTo(OVAL_CIRCUIT.length - 10, 9);
  });

  it('aumenta de forma continua al avanzar por toda la vuelta, también por el borde', () => {
    for (const offset of [-6, 0, 6]) {
      let previous = getTrackProgress(OVAL_CIRCUIT, 0, -50 + offset);
      let travelled = 0;
      // Recorre el trazado en pasos de 1 m, corrido a lo ancho de la pista.
      const steps = Math.round(OVAL_CIRCUIT.length);
      for (let step = 1; step <= steps; step += 1) {
        const along = (step * OVAL_CIRCUIT.length) / steps;
        const segment = OVAL_CIRCUIT.distances.findLastIndex((distance) => distance <= along);
        const a = points[segment];
        const b = points[(segment + 1) % points.length];
        const end = OVAL_CIRCUIT.distances[segment + 1] ?? OVAL_CIRCUIT.length;
        const t =
          (along - OVAL_CIRCUIT.distances[segment]) / (end - OVAL_CIRCUIT.distances[segment]);
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        // Normal hacia la izquierda de la marcha.
        const x = a.x + (b.x - a.x) * t + ((b.z - a.z) / length) * offset;
        const z = a.z + (b.z - a.z) * t - ((b.x - a.x) / length) * offset;
        const progress = getTrackProgress(OVAL_CIRCUIT, x, z);
        const delta = getProgressDelta(previous, progress, OVAL_CIRCUIT.length);
        expect(delta).toBeGreaterThan(0);
        expect(delta).toBeLessThan(2);
        travelled += delta;
        previous = progress;
      }
      expect(travelled).toBeCloseTo(OVAL_CIRCUIT.length, 6);
    }
  });
});

describe('getProgressDelta', () => {
  it('mide el avance por el camino corto, también al cruzar la meta', () => {
    expect(getProgressDelta(10, 15, 700)).toBe(5);
    expect(getProgressDelta(15, 10, 700)).toBe(-5);
    expect(getProgressDelta(698, 3, 700)).toBe(5);
    expect(getProgressDelta(3, 698, 700)).toBe(-5);
  });
});

describe('getLapDirection', () => {
  it('el óvalo se recorre en sentido horario', () => {
    expect(getLapDirection(OVAL_TRACK)).toBe(1);
  });

  it('al revés, es antihorario', () => {
    expect(getLapDirection({ ...OVAL_TRACK, centerline: [...points].reverse() })).toBe(-1);
  });
});

describe('getFinishSign', () => {
  it('queda afuera del circuito, pegado al borde y después de la línea', () => {
    // Óvalo horario: la meta está arriba, mirando a +x; afuera es -z (arriba).
    const sign = getFinishSign(OVAL_TRACK, 8, 3, 1);
    expect(sign.z).toBeCloseTo(-50 - (7 + 1 + 1.5), 9);
    expect(sign.x).toBeCloseTo(0.9 + 1 + 4, 9);
    // El texto corre en el sentido de la marcha (+x): sin giro.
    expect(sign.rotation).toBeCloseTo(0, 9);
  });

  it('en un circuito antihorario va del otro lado', () => {
    const reversed = createCircuit({
      ...OVAL_CIRCUIT,
      centerline: [points[0], ...points.slice(1).reverse()],
      checkpointFractions: [],
    });
    // Meta mirando a -x: el afuera sigue arriba (-z), ahora a la derecha de la marcha,
    // y el cartel queda adelante de la línea, hacia -x.
    const sign = getFinishSign(reversed, 8, 3, 1);
    expect(sign.z).toBeCloseTo(-59.5, 9);
    expect(sign.x).toBeCloseTo(-5.9, 9);
    // El texto correría hacia -x (cabeza abajo): se gira media vuelta para leerlo derecho.
    expect(Math.abs(sign.rotation)).toBeCloseTo(0, 9);
  });
});

describe('OVAL_TRACK', () => {
  it('es un óvalo de 14 m de ancho', () => {
    expect(track.width).toBe(14);
    expect(track).toEqual(
      createOvalTrack({ straightLength: 200, radius: 50, width: 14, segmentsPerCurve: 32 }),
    );
  });

  it('es serializable sin pérdidas', () => {
    expect(JSON.parse(JSON.stringify(track))).toEqual(track);
  });
});

describe('getFinishLine', () => {
  it('atraviesa la pista en el punto 0, con el ancho de la pista, mirando a +x', () => {
    expect(getFinishLine(track)).toEqual({
      x: 0,
      z: -50,
      heading: Math.PI / 2,
      length: 14,
      thickness: 1.8,
    });
  });
});

describe('getStartPose', () => {
  it('está sobre el trazado, 15 m antes de la meta y mirando hacia ella', () => {
    const start = getStartPose(track);
    expect(start).toEqual({ x: -15, z: -50, heading: Math.PI / 2 });
  });

  it('recorre varios tramos si el último es más corto que la distancia', () => {
    const square: TrackData = {
      centerline: [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 10, z: 10 },
        { x: 0, z: 10 },
      ],
      width: 4,
    };
    // Hacia atrás desde (0, 0): 10 m hasta (0, 10) y 5 m más hacia (10, 10).
    const start = getStartPose(square);
    expect(start.x).toBeCloseTo(5, 12);
    expect(start.z).toBeCloseTo(10, 12);
    expect(start.heading).toBeCloseTo(-Math.PI / 2, 12);
  });

  it('desde la largada, el auto avanza hacia la meta', () => {
    const start = getStartPose(track);
    let car = createCarState(start.x, start.z, start.heading);
    for (let i = 0; i < 30; i += 1) {
      car = stepCar(car, { steer: 0, brake: 0 }, DEFAULT_DRIVING_CONFIG, 1 / 60);
    }
    expect(car.x).toBeGreaterThan(start.x);
    expect(car.z).toBeCloseTo(start.z, 9);
  });
});

describe('getNearestOnCenterline', () => {
  it('sobre una recta, proyecta en perpendicular', () => {
    expect(getNearestOnCenterline(track, 30, -58)).toEqual({
      x: 30,
      z: -50,
      distance: 8,
      segment: 0,
      t: 0.3,
    });
  });

  it('en una curva, mide hacia el arco', () => {
    const hit = getNearestOnCenterline(track, 160, 0);
    expect(hit.x).toBeCloseTo(150, 9);
    expect(hit.z).toBeCloseTo(0, 9);
    expect(hit.distance).toBeCloseTo(10, 9);
  });

  it('desde el centro del óvalo, la distancia es el radio', () => {
    expect(getNearestOnCenterline(track, 0, 0).distance).toBeCloseTo(50, 9);
  });

  it('sobre el trazado, la distancia es 0', () => {
    const point = points[20];
    expect(getNearestOnCenterline(track, point.x, point.z).distance).toBe(0);
  });

  it('con el segmento anterior como pista, busca cerca y da lo mismo que la búsqueda completa', () => {
    // Puntos sobre el borde de toda la vuelta, con la pista del segmento vecino.
    points.forEach((point, i) => {
      const full = getNearestOnCenterline(track, point.x + 3, point.z + 4);
      const near = getNearestOnCenterline(track, point.x + 3, point.z + 4, (i + 2) % points.length);
      expect(near).toEqual(full);
    });
  });

  it('si la pista del segmento está lejos, vuelve a buscar en todo el trazado', () => {
    // Punto sobre la recta superior, con una pista del otro lado del óvalo.
    const hit = getNearestOnCenterline(track, 30, -50, 50);
    expect(hit).toMatchObject({ x: 30, z: -50, distance: 0, segment: 0 });
    // Una pista fuera de rango se ignora.
    expect(getNearestOnCenterline(track, 30, -50, 999)).toEqual(
      getNearestOnCenterline(track, 30, -50),
    );
  });

  it('el segmento que cierra la vuelta también cuenta', () => {
    const hit = getNearestOnCenterline(track, -30, -45);
    expect(hit.segment).toBe(points.length - 1);
    expect(hit.distance).toBeCloseTo(5, 9);
  });
});

describe('getCurveSections', () => {
  it('en el óvalo encuentra las dos curvas, de punta a punta y sin las rectas', () => {
    const sections = getCurveSections(track);
    expect(sections).toHaveLength(2);
    const [right, left] = sections;
    expect(right).toHaveLength(33);
    expect(right[0]).toEqual({ x: 100, z: -50 });
    expect(right[32]).toEqual({ x: 100, z: 50 });
    expect(left).toHaveLength(33);
    expect(left[0]).toEqual({ x: -100, z: 50 });
    expect(left[32]).toEqual({ x: -100, z: -50 });
  });

  it('con un radio máximo menor que el de las curvas, no hay pianos', () => {
    expect(getCurveSections(track, 40)).toEqual([]);
  });

  it('una pista toda curva devuelve la vuelta entera, cerrada', () => {
    const circle: TrackData = {
      centerline: Array.from({ length: 24 }, (_, i) => ({
        x: 30 * Math.cos((i * Math.PI) / 12),
        z: 30 * Math.sin((i * Math.PI) / 12),
      })),
      width: 10,
    };
    const [section, ...rest] = getCurveSections(circle);
    expect(rest).toHaveLength(0);
    expect(section).toHaveLength(25);
    expect(section[24]).toBe(circle.centerline[0]);
  });

  it('una curva que cruza el punto 0 no queda partida en dos', () => {
    // El óvalo empezando en medio de la curva derecha.
    const shifted: TrackData = {
      ...track,
      centerline: [...points.slice(17), ...points.slice(0, 17)],
    };
    const sections = getCurveSections(shifted);
    expect(sections).toHaveLength(2);
    expect(sections.map((section) => section.length)).toEqual([33, 33]);
  });
});
