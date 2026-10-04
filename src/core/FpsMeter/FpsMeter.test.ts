import { smoothFps } from './FpsMeter';

describe('smoothFps', () => {
  it('la primera muestra es el fps instantáneo', () => {
    expect(smoothFps(0, 16.6667)).toBeCloseTo(60, 1);
  });

  it('ignora dt cero o negativo', () => {
    expect(smoothFps(55, 0)).toBe(55);
    expect(smoothFps(55, -3)).toBe(55);
  });

  it('mezcla la muestra nueva con el peso indicado', () => {
    // previo 60, instantáneo 30, peso 0.5 => 45
    expect(smoothFps(60, 1000 / 30, 0.5)).toBeCloseTo(45, 5);
  });

  it('converge al fps real si es constante', () => {
    let fps = 0;
    for (let i = 0; i < 200; i++) {
      fps = smoothFps(fps, 1000 / 60);
    }
    expect(fps).toBeCloseTo(60, 3);
  });

  it('un cuadro lento mueve poco el promedio con el peso por defecto', () => {
    const fps = smoothFps(60, 100);
    expect(fps).toBeGreaterThan(50);
    expect(fps).toBeLessThan(60);
  });
});
