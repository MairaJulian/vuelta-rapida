import type { CarState } from '@/core/DrivingModel';
import { clamp } from '@/core/MathUtils';

import type {
  CameraConfig,
  CameraState,
  CameraView,
  LookAhead,
  ScreenPoint,
  Viewport,
} from './Camera.types';

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  pixelsPerMeter: 14,
  speedZoomOut: 0.35,
  lookAheadSeconds: 0.5,
  maxLookAheadFraction: 0.3,
  lookAheadSmoothing: 0.5,
  rotateWithCar: false,
};

/** Cámara sin adelanto, para empezar o reiniciar. */
export function createCameraState(): CameraState {
  'worklet';
  return { lookX: 0, lookZ: 0 };
}

/** Zoom en dp por metro: se aleja con la velocidad según `speedZoomOut`. */
export function getCameraScale(car: CarState, config: CameraConfig, maxSpeed: number): number {
  'worklet';
  const speed = Math.hypot(car.vx, car.vz);
  const speedRatio = maxSpeed > 0 ? clamp(speed / maxSpeed, 0, 1) : 0;
  return config.pixelsPerMeter * (1 - clamp(config.speedZoomOut, 0, 1) * speedRatio);
}

/**
 * Adelanto al que tiende la cámara: la velocidad por `lookAheadSeconds`, en la
 * dirección del movimiento (hacia atrás en marcha atrás) y proporcional a la
 * velocidad, con un tope de `maxLookAheadFraction` del lado menor de la pantalla.
 */
export function getLookAheadTarget(
  car: CarState,
  viewport: Viewport,
  config: CameraConfig,
  maxSpeed: number,
): LookAhead {
  'worklet';
  const scale = getCameraScale(car, config, maxSpeed);
  let x = car.vx * config.lookAheadSeconds;
  let z = car.vz * config.lookAheadSeconds;
  const length = Math.hypot(x, z);
  const maxLook =
    scale > 0
      ? (config.maxLookAheadFraction * Math.min(viewport.width, viewport.height)) / scale
      : 0;
  if (length > maxLook) {
    const shrink = length > 0 ? maxLook / length : 0;
    x *= shrink;
    z *= shrink;
  }
  return { x, z };
}

/**
 * Avanza la cámara `dt` segundos: el adelanto se acerca al objetivo de forma
 * exponencial, así que los cambios de velocidad o de dirección no la hacen saltar.
 * El resultado no depende de los fps.
 */
export function stepCamera(
  state: CameraState,
  car: CarState,
  viewport: Viewport,
  config: CameraConfig,
  maxSpeed: number,
  dt: number,
): CameraState {
  'worklet';
  const target = getLookAheadTarget(car, viewport, config, maxSpeed);
  if (config.lookAheadSmoothing <= 0) {
    return { lookX: target.x, lookZ: target.z };
  }
  if (dt <= 0) {
    return state;
  }
  const blend = 1 - Math.exp(-dt / config.lookAheadSmoothing);
  return {
    lookX: state.lookX + (target.x - state.lookX) * blend,
    lookZ: state.lookZ + (target.z - state.lookZ) * blend,
  };
}

/**
 * Qué muestra la cámara: sigue al auto, adelantada según `camera` (de
 * `stepCamera`), y se aleja con la velocidad.
 */
export function getCameraView(
  car: CarState,
  camera: CameraState,
  config: CameraConfig,
  maxSpeed: number,
): CameraView {
  'worklet';
  return {
    targetX: car.x + camera.lookX,
    targetZ: car.z + camera.lookZ,
    scale: getCameraScale(car, config, maxSpeed),
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
