import { advanceBoxMotion } from './BoxMotion';
import type { BoxMotionConfig } from './BoxMotion.types';

const config: BoxMotionConfig = { speed: 100, boxWidth: 20, areaWidth: 220 };

describe('advanceBoxMotion', () => {
  it('avanza según velocidad y tiempo', () => {
    const next = advanceBoxMotion({ x: 0, direction: 1 }, 500, config);
    expect(next).toEqual({ x: 50, direction: 1 });
  });

  it('no se mueve con dt cero o negativo', () => {
    const state = { x: 10, direction: 1 as const };
    expect(advanceBoxMotion(state, 0, config)).toBe(state);
    expect(advanceBoxMotion(state, -5, config)).toBe(state);
  });

  it('rebota en el borde derecho', () => {
    // maxX = 200. Desde 190 con +20px se pasa 10px y vuelve a 190.
    const next = advanceBoxMotion({ x: 190, direction: 1 }, 200, config);
    expect(next).toEqual({ x: 190, direction: -1 });
  });

  it('rebota en el borde izquierdo', () => {
    const next = advanceBoxMotion({ x: 10, direction: -1 }, 200, config);
    expect(next).toEqual({ x: 10, direction: 1 });
  });

  it('nunca sale del área aunque el dt sea enorme', () => {
    const next = advanceBoxMotion({ x: 0, direction: 1 }, 100000, config);
    expect(next.x).toBeGreaterThanOrEqual(0);
    expect(next.x).toBeLessThanOrEqual(200);
  });

  it('con un área menor que el rectángulo se queda en 0', () => {
    const next = advanceBoxMotion({ x: 0, direction: 1 }, 100, {
      ...config,
      areaWidth: 10,
    });
    expect(next.x).toBe(0);
  });
});
