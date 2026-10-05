import { createCarState, DEFAULT_DRIVING_CONFIG, stepCar } from '@/core/DrivingModel';

import { DEFAULT_TRACK, getCenterlineRect, getCurves, getFinishLine, getStartPose } from './Track';

const track = DEFAULT_TRACK;

describe('Track', () => {
  it('la línea central es un rectángulo redondeado con forma de estadio', () => {
    expect(getCenterlineRect(track)).toEqual({
      x: -150,
      z: -50,
      width: 300,
      height: 100,
      radius: 50,
    });
  });

  it('respeta el centro del óvalo', () => {
    const rect = getCenterlineRect({ ...track, centerX: 10, centerZ: -5 });
    expect(rect.x + rect.width / 2).toBe(10);
    expect(rect.z + rect.height / 2).toBe(-5);
  });

  it('las curvas están en los extremos de las rectas', () => {
    const [left, right] = getCurves(track);
    expect(left).toEqual({ side: 'left', centerX: -100, centerZ: 0, radius: 50 });
    expect(right).toEqual({ side: 'right', centerX: 100, centerZ: 0, radius: 50 });
  });

  it('la meta atraviesa la recta superior con el ancho de la pista', () => {
    expect(getFinishLine(track)).toEqual({ x: 0, z: -50, length: 8, thickness: 1 });
  });

  it('la largada está sobre la línea central, antes de la meta y mirando hacia ella', () => {
    const start = getStartPose(track);
    const finish = getFinishLine(track);
    expect(start.z).toBe(finish.z);
    expect(start.x).toBeLessThan(finish.x);
    expect(start.heading).toBeCloseTo(Math.PI / 2, 12);
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
