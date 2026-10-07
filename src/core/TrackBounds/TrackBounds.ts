import type { CarState } from '@/core/DrivingModel';
import { getNearestOnCenterline } from '@/core/Track';
import type { CenterlineHit, TrackData } from '@/core/Track';

import type { TrackBoundsConfig } from './TrackBounds.types';

/**
 * Distancia máxima del centro del auto al trazado central, en metros: medio ancho
 * de la pista menos el radio del auto, así la carrocería no sale del asfalto.
 */
export function getTrackLimit(track: TrackData, config: TrackBoundsConfig): number {
  'worklet';
  return Math.max(track.width / 2 - config.collisionRadius, 0);
}

/**
 * Como `constrainToTrack`, con el punto más cercano del trazado ya calculado. La
 * simulación lo busca una vez por paso y lo usa también para el progreso: el auto
 * se corre sobre la normal de ese punto, así que el punto más cercano no cambia.
 *
 * Va antes que `constrainToTrack`: el plugin de worklets convierte las funciones
 * en constantes, así que una función tiene que estar declarada antes de usarse.
 */
export function constrainToHit(
  car: CarState,
  nearest: CenterlineHit,
  track: TrackData,
  config: TrackBoundsConfig,
  dt: number,
): CarState {
  'worklet';
  const limit = getTrackLimit(track, config);
  if (nearest.distance <= limit) {
    return car;
  }

  // Normal del borde hacia afuera: del trazado central al auto.
  const normalX = (car.x - nearest.x) / nearest.distance;
  const normalZ = (car.z - nearest.z) / nearest.distance;

  let vx = car.vx;
  let vz = car.vz;
  const outward = vx * normalX + vz * normalZ;
  if (outward > 0) {
    vx -= outward * normalX;
    vz -= outward * normalZ;
  }
  const friction = Math.exp(-Math.max(config.wallFriction, 0) * Math.max(dt, 0));

  return {
    ...car,
    x: nearest.x + normalX * limit,
    z: nearest.z + normalZ * limit,
    vx: vx * friction,
    vz: vz * friction,
  };
}

/**
 * Mantiene el auto dentro de la pista. Si pasó el borde, lo devuelve justo sobre
 * él, anula la parte de la velocidad que va hacia afuera (no rebota) y le resta
 * velocidad por el roce mientras lo toca. Lo que queda es deslizarse a lo largo
 * del borde. Pura y determinista; si el auto está dentro, lo devuelve tal cual.
 */
export function constrainToTrack(
  car: CarState,
  track: TrackData,
  config: TrackBoundsConfig,
  dt: number,
): CarState {
  'worklet';
  return constrainToHit(car, getNearestOnCenterline(track, car.x, car.z), track, config, dt);
}
