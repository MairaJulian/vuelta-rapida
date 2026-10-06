import { createCarState, DEFAULT_DRIVING_CONFIG, stepCar } from '@/core/DrivingModel';

import {
  createOvalCenterline,
  createOvalTrack,
  DEFAULT_TRACK,
  getCurveSections,
  getFinishLine,
  getNearestOnCenterline,
  getStartPose,
} from './Track';
import type { TrackData, TrackPoint } from './Track.types';

const track = DEFAULT_TRACK;
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

describe('DEFAULT_TRACK', () => {
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
      thickness: 1,
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
