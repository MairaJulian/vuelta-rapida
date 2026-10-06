import { createCarState } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';

import {
  createCameraState,
  DEFAULT_CAMERA_CONFIG,
  getCameraScale,
  getCameraView,
  getLookAheadTarget,
  stepCamera,
  worldToScreen,
} from './Camera';
import type { CameraConfig, CameraState } from './Camera.types';

const viewport = { width: 800, height: 360 };
const MAX_SPEED = 42;
const still: CameraConfig = {
  ...DEFAULT_CAMERA_CONFIG,
  speedZoomOut: 0,
  lookAheadSeconds: 0,
};
const centered = createCameraState();

function moving(heading: number, speed: number): CarState {
  return {
    ...createCarState(30, -12, heading),
    vx: Math.sin(heading) * speed,
    vz: -Math.cos(heading) * speed,
  };
}

/** Avanza la cámara `frames` cuadros de `dt` segundos con el auto fijo. */
function follow(car: CarState, config: CameraConfig, frames: number, dt = 1 / 60): CameraState {
  let camera = createCameraState();
  for (let i = 0; i < frames; i += 1) {
    camera = stepCamera(camera, car, viewport, config, MAX_SPEED, dt);
  }
  return camera;
}

describe('getCameraView', () => {
  it('sin adelanto, el auto queda en el centro de la pantalla', () => {
    const car = moving(0.4, 20);
    const view = getCameraView(car, centered, still, MAX_SPEED);
    expect(worldToScreen(car.x, car.z, view, viewport)).toEqual({ x: 400, y: 180 });
  });

  it('aplica el adelanto de la cámara', () => {
    const car = moving(0, 20);
    const view = getCameraView(car, { lookX: 3, lookZ: -2 }, still, MAX_SPEED);
    expect(view.targetX).toBe(car.x + 3);
    expect(view.targetZ).toBe(car.z - 2);
  });

  it('sin rotación, el norte del mundo (-z) queda arriba', () => {
    const car = createCarState(0, 0, 1.2);
    const view = getCameraView(car, centered, still, MAX_SPEED);
    expect(view.rotation).toBe(0);
    expect(worldToScreen(0, -10, view, viewport).y).toBeLessThan(180);
  });

  it('con rotateWithCar, lo que está delante del auto queda arriba en pantalla', () => {
    const heading = 2.1;
    const car = createCarState(5, 5, heading);
    const config = { ...still, rotateWithCar: true };
    const view = getCameraView(car, centered, config, MAX_SPEED);
    const ahead = worldToScreen(
      car.x + Math.sin(heading) * 10,
      car.z - Math.cos(heading) * 10,
      view,
      viewport,
    );
    expect(ahead.x).toBeCloseTo(400, 9);
    expect(ahead.y).toBeCloseTo(180 - 10 * view.scale, 9);
  });
});

describe('getCameraScale', () => {
  it('detenido usa el zoom base', () => {
    const scale = getCameraScale(createCarState(0, 0, 0), DEFAULT_CAMERA_CONFIG, MAX_SPEED);
    expect(scale).toBe(DEFAULT_CAMERA_CONFIG.pixelsPerMeter);
  });

  it('se aleja a velocidad máxima según speedZoomOut', () => {
    const config = { ...still, speedZoomOut: 0.35 };
    const scale = getCameraScale(moving(0, MAX_SPEED), config, MAX_SPEED);
    expect(scale).toBeCloseTo(config.pixelsPerMeter * 0.65, 12);
  });

  it('no se rompe con maxSpeed 0', () => {
    const scale = getCameraScale(moving(0, 10), DEFAULT_CAMERA_CONFIG, 0);
    expect(scale).toBe(DEFAULT_CAMERA_CONFIG.pixelsPerMeter);
  });
});

describe('getLookAheadTarget', () => {
  const config = { ...still, lookAheadSeconds: 0.1, maxLookAheadFraction: 1 };

  it('se adelanta en la dirección de la velocidad', () => {
    const target = getLookAheadTarget(moving(Math.PI / 2, 20), viewport, config, MAX_SPEED);
    expect(target.x).toBeCloseTo(2, 9);
    expect(target.z).toBeCloseTo(0, 9);
  });

  it('es proporcional a la velocidad', () => {
    const slow = getLookAheadTarget(moving(0.7, 10), viewport, config, MAX_SPEED);
    const fast = getLookAheadTarget(moving(0.7, 20), viewport, config, MAX_SPEED);
    expect(fast.x).toBeCloseTo(slow.x * 2, 9);
    expect(fast.z).toBeCloseTo(slow.z * 2, 9);
  });

  it('en marcha atrás mira hacia atrás del auto', () => {
    // Rumbo hacia -z pero moviéndose hacia +z.
    const reversing = { ...createCarState(0, 0, 0), vz: 5 };
    expect(getLookAheadTarget(reversing, viewport, config, MAX_SPEED).z).toBeGreaterThan(0);
  });

  it('limita el adelanto a una fracción de la pantalla', () => {
    const capped = { ...still, lookAheadSeconds: 10, maxLookAheadFraction: 0.3 };
    const car = moving(Math.PI / 2, 40);
    const target = getLookAheadTarget(car, viewport, capped, MAX_SPEED);
    const scale = getCameraScale(car, capped, MAX_SPEED);
    expect(target.x * scale).toBeCloseTo(0.3 * 360, 9);
  });
});

describe('stepCamera', () => {
  const car = moving(Math.PI / 2, 20);
  const target = getLookAheadTarget(car, viewport, DEFAULT_CAMERA_CONFIG, MAX_SPEED);

  it('se acerca al objetivo de a poco, sin saltar', () => {
    const first = follow(car, DEFAULT_CAMERA_CONFIG, 1);
    expect(first.lookX).toBeGreaterThan(0);
    expect(first.lookX).toBeLessThan(target.x * 0.1);
  });

  it('en el tiempo de suavizado recorre el 63 % y luego llega al objetivo', () => {
    const frames = Math.round(DEFAULT_CAMERA_CONFIG.lookAheadSmoothing * 60);
    const atSmoothing = follow(car, DEFAULT_CAMERA_CONFIG, frames);
    expect(atSmoothing.lookX / target.x).toBeCloseTo(1 - Math.exp(-1), 9);
    const settled = follow(car, DEFAULT_CAMERA_CONFIG, frames * 10);
    expect(settled.lookX).toBeCloseTo(target.x, 3);
  });

  it('no depende de los fps', () => {
    const at60 = follow(car, DEFAULT_CAMERA_CONFIG, 30, 1 / 60);
    const at120 = follow(car, DEFAULT_CAMERA_CONFIG, 60, 1 / 120);
    expect(at120.lookX).toBeCloseTo(at60.lookX, 9);
  });

  it('con suavizado 0 sigue al objetivo al instante', () => {
    const instant = { ...DEFAULT_CAMERA_CONFIG, lookAheadSmoothing: 0 };
    expect(follow(car, instant, 1)).toEqual({ lookX: target.x, lookZ: target.z });
  });

  it('con dt 0 no cambia', () => {
    const state = { lookX: 1, lookZ: 2 };
    expect(stepCamera(state, car, viewport, DEFAULT_CAMERA_CONFIG, MAX_SPEED, 0)).toBe(state);
  });
});
