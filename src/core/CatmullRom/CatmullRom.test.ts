import { resampleClosedPolyline, sampleClosedCatmullRom } from './CatmullRom';
import type { PlanePoint } from './CatmullRom.types';

const square: PlanePoint[] = [
  { x: 0, z: 0 },
  { x: 100, z: 0 },
  { x: 100, z: 100 },
  { x: 0, z: 100 },
];

const distance = (a: PlanePoint, b: PlanePoint) => Math.hypot(b.x - a.x, b.z - a.z);

describe('sampleClosedCatmullRom', () => {
  it('pasa por cada punto de control, en orden', () => {
    const samples = sampleClosedCatmullRom(square, 10);
    expect(samples).toHaveLength(40);
    square.forEach((point, i) => {
      expect(samples[i * 10].x).toBeCloseTo(point.x, 9);
      expect(samples[i * 10].z).toBeCloseTo(point.z, 9);
    });
  });

  it('se cierra: el último tramo vuelve al primer punto sin saltos', () => {
    const samples = sampleClosedCatmullRom(square, 20);
    const steps = samples.map((point, i) => distance(point, samples[(i + 1) % samples.length]));
    // Ningún paso (incluido el que cierra la vuelta) es mucho más largo que el promedio.
    const average = steps.reduce((a, b) => a + b) / steps.length;
    expect(Math.max(...steps)).toBeLessThan(average * 2);
  });

  it('con puntos alineados, la curva sigue la recta', () => {
    const line: PlanePoint[] = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 20, z: 0 },
      { x: 30, z: 0 },
      { x: 15, z: 40 },
    ];
    const samples = sampleClosedCatmullRom(line, 8);
    // Entre el segundo y el tercer punto (los dos vecinos también alineados), z = 0.
    for (let s = 8; s <= 16; s += 1) {
      expect(samples[s].z).toBeCloseTo(0, 9);
    }
  });

  it('centrípeta: con puntos muy despares no forma rulos', () => {
    // Un punto muy cerca de otro: la uniforme (alpha 0) haría un rulo entre ellos.
    const uneven: PlanePoint[] = [
      { x: 0, z: 0 },
      { x: 100, z: 0 },
      { x: 101, z: 1 },
      { x: 100, z: 100 },
    ];
    const samples = sampleClosedCatmullRom(uneven, 30);
    const maxX = Math.max(...samples.map((point) => point.x));
    expect(maxX).toBeLessThan(110);
  });

  it('tolera puntos de control repetidos', () => {
    const repeated = [...square.slice(0, 2), square[1], ...square.slice(2)];
    const samples = sampleClosedCatmullRom(repeated, 5);
    expect(samples.every((point) => Number.isFinite(point.x) && Number.isFinite(point.z))).toBe(
      true,
    );
  });
});

describe('resampleClosedPolyline', () => {
  it('reparte la vuelta en pasos iguales, cerca del espaciado pedido', () => {
    const { points, distances, length } = resampleClosedPolyline(square, 3);
    expect(length).toBe(400);
    expect(points).toHaveLength(133);
    const step = 400 / 133;
    points.forEach((point, i) => {
      expect(distances[i]).toBeCloseTo(i * step, 9);
      // En el cuadrado, los pasos que doblan una esquina son un poco más cortos en línea recta.
      expect(distance(point, points[(i + 1) % points.length])).toBeLessThanOrEqual(step + 1e-9);
    });
  });

  it('conserva el primer punto', () => {
    const { points, distances } = resampleClosedPolyline(square, 7);
    expect(points[0]).toEqual({ x: 0, z: 0 });
    expect(distances[0]).toBe(0);
  });

  it('los puntos quedan sobre la polilínea, también en el tramo que cierra la vuelta', () => {
    const { points } = resampleClosedPolyline(square, 10);
    const last = points.at(-1)!;
    expect(last.x).toBe(0);
    expect(last.z).toBeCloseTo(10, 9);
  });
});
