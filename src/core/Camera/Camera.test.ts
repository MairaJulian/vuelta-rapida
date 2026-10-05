import { createCarState } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';

import { DEFAULT_CAMERA_CONFIG, getCameraView, worldToScreen } from './Camera';
import type { CameraConfig } from './Camera.types';

const viewport = { width: 800, height: 360 };
const MAX_SPEED = 50;
const still: CameraConfig = {
  ...DEFAULT_CAMERA_CONFIG,
  speedZoomOut: 0,
  lookAheadSeconds: 0,
};

function moving(heading: number, speed: number): CarState {
  return {
    ...createCarState(30, -12, heading),
    vx: Math.sin(heading) * speed,
    vz: -Math.cos(heading) * speed,
  };
}

describe('getCameraView', () => {
  it('sin adelanto, el auto queda en el centro de la pantalla', () => {
    const car = moving(0.4, 20);
    const view = getCameraView(car, viewport, still, MAX_SPEED);
    expect(worldToScreen(car.x, car.z, view, viewport)).toEqual({ x: 400, y: 180 });
  });

  it('detenido usa el zoom base', () => {
    const view = getCameraView(createCarState(0, 0, 0), viewport, DEFAULT_CAMERA_CONFIG, MAX_SPEED);
    expect(view.scale).toBe(DEFAULT_CAMERA_CONFIG.pixelsPerMeter);
  });

  it('se aleja a velocidad máxima según speedZoomOut', () => {
    const config = { ...still, speedZoomOut: 0.35 };
    const view = getCameraView(moving(0, MAX_SPEED), viewport, config, MAX_SPEED);
    expect(view.scale).toBeCloseTo(config.pixelsPerMeter * 0.65, 12);
  });

  it('se adelanta en la dirección de la velocidad', () => {
    const config = { ...still, lookAheadSeconds: 0.1, maxLookAheadFraction: 1 };
    const car = moving(Math.PI / 2, 20); // hacia +x
    const view = getCameraView(car, viewport, config, MAX_SPEED);
    expect(view.targetX).toBeCloseTo(car.x + 2, 9);
    // El auto queda a la izquierda del centro: se ve más pista por delante.
    expect(worldToScreen(car.x, car.z, view, viewport).x).toBeLessThan(400);
  });

  it('limita el adelanto a una fracción de la pantalla', () => {
    const config = { ...still, lookAheadSeconds: 10, maxLookAheadFraction: 0.3 };
    const car = moving(Math.PI / 2, 40);
    const view = getCameraView(car, viewport, config, MAX_SPEED);
    const offsetDp = (view.targetX - car.x) * view.scale;
    expect(offsetDp).toBeCloseTo(0.3 * 360, 9);
  });

  it('sin rotación, el norte del mundo (-z) queda arriba', () => {
    const car = createCarState(0, 0, 1.2);
    const view = getCameraView(car, viewport, still, MAX_SPEED);
    expect(view.rotation).toBe(0);
    expect(worldToScreen(0, -10, view, viewport).y).toBeLessThan(180);
  });

  it('con rotateWithCar, lo que está delante del auto queda arriba en pantalla', () => {
    const heading = 2.1;
    const car = createCarState(5, 5, heading);
    const config = { ...still, rotateWithCar: true };
    const view = getCameraView(car, viewport, config, MAX_SPEED);
    const ahead = worldToScreen(
      car.x + Math.sin(heading) * 10,
      car.z - Math.cos(heading) * 10,
      view,
      viewport,
    );
    expect(ahead.x).toBeCloseTo(400, 9);
    expect(ahead.y).toBeCloseTo(180 - 10 * view.scale, 9);
  });

  it('no se rompe con maxSpeed 0', () => {
    const view = getCameraView(moving(0, 10), viewport, DEFAULT_CAMERA_CONFIG, 0);
    expect(view.scale).toBe(DEFAULT_CAMERA_CONFIG.pixelsPerMeter);
  });
});
