import { clamp, lerp, lerpAngle, wrapAngle } from './MathUtils';

describe('clamp', () => {
  it('deja pasar valores dentro del rango', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('recorta por abajo y por arriba', () => {
    expect(clamp(-3, -1, 1)).toBe(-1);
    expect(clamp(3, -1, 1)).toBe(1);
  });
});

describe('lerp', () => {
  it('devuelve los extremos con t = 0 y t = 1', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('interpola en el medio', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
});

describe('wrapAngle', () => {
  it('no toca ángulos dentro de (-π, π]', () => {
    expect(wrapAngle(1)).toBe(1);
    expect(wrapAngle(Math.PI)).toBe(Math.PI);
  });

  it('lleva -π a π', () => {
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it('normaliza vueltas completas', () => {
    expect(wrapAngle(Math.PI * 2 + 0.5)).toBeCloseTo(0.5, 12);
    expect(wrapAngle(-Math.PI * 4 - 0.5)).toBeCloseTo(-0.5, 12);
  });
});

describe('lerpAngle', () => {
  it('interpola normalmente lejos de ±π', () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5, 12);
  });

  it('cruza ±π por el arco corto', () => {
    const from = Math.PI - 0.1;
    const to = -Math.PI + 0.1;
    const middle = lerpAngle(from, to, 0.5);
    expect(Math.abs(middle)).toBeCloseTo(Math.PI, 12);
  });
});
