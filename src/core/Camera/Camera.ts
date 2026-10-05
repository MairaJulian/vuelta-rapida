import type { CarState } from '@/core/DrivingModel';
import { clamp } from '@/core/MathUtils';

import type { CameraConfig, CameraView, ScreenPoint, Viewport } from './Camera.types';

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  pixelsPerMeter: 14,
  speedZoomOut: 0.35,
  lookAheadSeconds: 0.5,
  maxLookAheadFraction: 0.3,
  rotateWithCar: false,
};

/**
 * Calcula qué muestra la cámara para un estado del auto.
 * Sigue al auto, se aleja con la velocidad y se adelanta en la dirección del
 * movimiento para que se vea más pista por delante.
 */
export function getCameraView(
  car: CarState,
  viewport: Viewport,
  config: CameraConfig,
  maxSpeed: number,
): CameraView {
  'worklet';
  const speed = Math.hypot(car.vx, car.vz);
  const speedRatio = maxSpeed > 0 ? clamp(speed / maxSpeed, 0, 1) : 0;
  const scale = config.pixelsPerMeter * (1 - clamp(config.speedZoomOut, 0, 1) * speedRatio);

  let lookX = car.vx * config.lookAheadSeconds;
  let lookZ = car.vz * config.lookAheadSeconds;
  const lookLength = Math.hypot(lookX, lookZ);
  const maxLook =
    scale > 0
      ? (config.maxLookAheadFraction * Math.min(viewport.width, viewport.height)) / scale
      : 0;
  if (lookLength > maxLook) {
    const shrink = lookLength > 0 ? maxLook / lookLength : 0;
    lookX *= shrink;
    lookZ *= shrink;
  }

  return {
    targetX: car.x + lookX,
    targetZ: car.z + lookZ,
    scale,
    rotation: config.rotateWithCar ? car.heading : 0,
  };
}

/** Convierte un punto del mundo (metros) a pantalla (dp) según la cámara. */
export function worldToScreen(
  x: number,
  z: number,
  view: CameraView,
  viewport: Viewport,
): ScreenPoint {
  'worklet';
  const dx = x - view.targetX;
  const dz = z - view.targetZ;
  const cos = Math.cos(-view.rotation);
  const sin = Math.sin(-view.rotation);
  return {
    x: viewport.width / 2 + (dx * cos - dz * sin) * view.scale,
    y: viewport.height / 2 + (dx * sin + dz * cos) * view.scale,
  };
}
