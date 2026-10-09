import type { CarState } from '@/core/DrivingModel';
import { EDGE_WIDTH_RATIO, getNearestOnCenterline, KERB_WIDTH_RATIO } from '@/core/Track';
import type { CenterlineHit, TrackData } from '@/core/Track';

import type { TrackBoundsConfig, TrackContact, TrackContactResult } from './TrackBounds.types';

/** Sin tocar el borde ni pisar pianos. */
export const NO_CONTACT: TrackContact = Object.freeze({
  touching: false,
  impactSpeed: 0,
  onKerb: false,
});

/**
 * Distancia máxima del centro del auto al trazado central, en metros: medio ancho
 * de la pista menos el radio del auto, así la carrocería no sale del asfalto.
 */
export function getTrackLimit(track: TrackData, config: TrackBoundsConfig): number {
  'worklet';
  return Math.max(track.width / 2 - config.collisionRadius, 0);
}

/**
 * Cuánto más afuera puede ir el auto sobre un piano a pleno, en metros: del borde
 * del asfalto al borde exterior del piano (con 14 m de ancho, 1,78 m).
 */
export function getKerbReach(track: TrackData): number {
  'worklet';
  return (track.width / 2) * (KERB_WIDTH_RATIO - 1);
}

/**
 * Distancia del centro del auto al trazado desde la que la carrocería pisa el
 * piano: el piano empieza después del borde blanco.
 */
export function getKerbContactDistance(track: TrackData, config: TrackBoundsConfig): number {
  'worklet';
  return (track.width / 2) * EDGE_WIDTH_RATIO - config.collisionRadius;
}

/**
 * Aplica el límite de pista con el punto más cercano del trazado ya buscado y
 * cuenta cómo fue el contacto. `kerbFactor` (de `getKerbFactor`, de 0 a 1) dice
 * cuánto del piano se puede pisar ahí: en una curva el límite llega hasta el borde
 * exterior del piano.
 *
 * Si el auto pasó el límite, lo devuelve justo sobre él, anula la parte de la
 * velocidad que va hacia afuera (no rebota; esa parte es `impactSpeed`) y le resta
 * velocidad por el roce. Lo que queda es deslizarse a lo largo del borde. Pura.
 */
export function resolveTrackContact(
  car: CarState,
  nearest: CenterlineHit,
  track: TrackData,
  config: TrackBoundsConfig,
  dt: number,
  kerbFactor = 0,
): TrackContactResult {
  'worklet';
  const limit = getTrackLimit(track, config) + Math.max(kerbFactor, 0) * getKerbReach(track);
  const kerbFrom = getKerbContactDistance(track, config);
  if (nearest.distance <= limit) {
    const onKerb = kerbFactor > 0 && nearest.distance > kerbFrom;
    return { car, contact: onKerb ? { touching: false, impactSpeed: 0, onKerb } : NO_CONTACT };
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
    car: {
      ...car,
      x: nearest.x + normalX * limit,
      z: nearest.z + normalZ * limit,
      vx: vx * friction,
      vz: vz * friction,
    },
    contact: {
      touching: true,
      impactSpeed: Math.max(outward, 0),
      onKerb: kerbFactor > 0 && limit > kerbFrom,
    },
  };
}

/**
 * Como `constrainToTrack`, con el punto más cercano del trazado ya calculado. La
 * simulación lo busca una vez por paso y lo usa también para el progreso: el auto
 * se corre sobre la normal de ese punto, así que el punto más cercano no cambia.
 *
 * Las funciones worklet van antes de las que las usan: el plugin de worklets las
 * convierte en constantes, así que una función tiene que estar declarada antes.
 */
export function constrainToHit(
  car: CarState,
  nearest: CenterlineHit,
  track: TrackData,
  config: TrackBoundsConfig,
  dt: number,
  kerbFactor = 0,
): CarState {
  'worklet';
  return resolveTrackContact(car, nearest, track, config, dt, kerbFactor).car;
}

/**
 * Mantiene el auto dentro de la pista (sin pianos). Si pasó el borde, lo devuelve
 * justo sobre él, anula la parte de la velocidad que va hacia afuera (no rebota) y
 * le resta velocidad por el roce mientras lo toca. Pura y determinista; si el auto
 * está dentro, lo devuelve tal cual.
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
