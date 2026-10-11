import type { CarState } from '@/core/DrivingModel';
import { clamp } from '@/core/MathUtils';

import type { CarCollisionResult, CollisionConfig } from './CarCollisions.types';

/**
 * Valores iniciales. El radio de 1,3 m deja los autos (2 × 4,5 m) a 2,6 m entre centros: lado
 * a lado no se tocan y en fila se superponen poco. El empujón es leve, y el que choca por
 * detrás pierde 1,2 por segundo de contacto; el que recibe el choque, casi nada.
 */
export const DEFAULT_COLLISION_CONFIG: CollisionConfig = Object.freeze({
  enabled: true,
  radius: 1.3,
  pushSpeed: 1.5,
  rearLossRate: 1.2,
  frontLossRate: 0.3,
});

/** Choques apagados: los autos se atraviesan. */
export const NO_COLLISIONS: CollisionConfig = Object.freeze({
  ...DEFAULT_COLLISION_CONFIG,
  enabled: false,
});

/** Distancia por debajo de la cual dos centros cuentan como el mismo punto. */
const MIN_DISTANCE = 1e-6;

/** Con qué parte del auto mira hacia el otro: coseno entre su rumbo y la dirección al otro. */
function facing(car: CarState, towardX: number, towardZ: number): number {
  'worklet';
  return Math.sin(car.heading) * towardX - Math.cos(car.heading) * towardZ;
}

/**
 * Resuelve los choques de un paso entre todos los autos (un círculo por auto). Por cada
 * par solapado:
 *
 * 1. **Separa** los autos a partes iguales, sobre la línea que une los centros.
 * 2. **Empuja** leve: la velocidad con que se alejan sube hasta `pushSpeed` (nunca más
 *    que eso por paso), a partes iguales. No toca el rumbo: nadie gira ni hace trompo.
 * 3. **Frena**: cada auto pierde velocidad con `exp(−tasa·dt)`. La tasa va de
 *    `frontLossRate` a `rearLossRate` según cuánto el otro auto está delante de él: el que
 *    choca por detrás paga más; de costado, la tasa es el promedio.
 *
 * No sabe de la pista: quien la llama tiene que devolver los autos movidos al asfalto.
 * Pura y determinista (el orden de los pares es fijo). Sin choques o con `enabled` en
 * falso, devuelve los mismos objetos.
 */
export function resolveCarCollisions(
  cars: CarState[],
  config: CollisionConfig,
  dt: number,
): CarCollisionResult {
  'worklet';
  const count = cars.length;
  const impactSpeeds: number[] = [];
  const touching: boolean[] = [];
  for (let i = 0; i < count; i += 1) {
    impactSpeeds.push(0);
    touching.push(false);
  }
  if (!config.enabled || count < 2) {
    return { cars, impactSpeeds, touching };
  }

  const reach = Math.max(config.radius, 0) * 2;
  const step = Math.max(dt, 0);
  const result = cars.slice();
  for (let i = 0; i < count - 1; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const a = result[i];
      const b = result[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= reach) {
        continue;
      }
      // Normal de a hacia b. Con los centros encimados, a la derecha de a (sin azar).
      const nx = distance > MIN_DISTANCE ? dx / distance : Math.cos(a.heading);
      const nz = distance > MIN_DISTANCE ? dz / distance : Math.sin(a.heading);
      const half = (reach - distance) / 2;

      // Velocidad con que b se aleja de a; negativa si se acercan.
      const separating = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      const closing = Math.max(-separating, 0);
      const boost = clamp((config.pushSpeed - separating) / 2, 0, Math.max(config.pushSpeed, 0));

      // a va detrás de b cuanto más mira hacia b y menos b mira hacia a.
      const rearShare = 0.5 + 0.5 * clamp(facing(a, nx, nz) - facing(b, -nx, -nz), -1, 1);
      const rateA = config.frontLossRate + (config.rearLossRate - config.frontLossRate) * rearShare;
      const rateB = config.rearLossRate + (config.frontLossRate - config.rearLossRate) * rearShare;
      const keepA = Math.exp(-Math.max(rateA, 0) * step);
      const keepB = Math.exp(-Math.max(rateB, 0) * step);

      result[i] = {
        ...a,
        x: a.x - nx * half,
        z: a.z - nz * half,
        vx: (a.vx - nx * boost) * keepA,
        vz: (a.vz - nz * boost) * keepA,
      };
      result[j] = {
        ...b,
        x: b.x + nx * half,
        z: b.z + nz * half,
        vx: (b.vx + nx * boost) * keepB,
        vz: (b.vz + nz * boost) * keepB,
      };
      touching[i] = true;
      touching[j] = true;
      impactSpeeds[i] = Math.max(impactSpeeds[i], closing);
      impactSpeeds[j] = Math.max(impactSpeeds[j], closing);
    }
  }
  return { cars: result, impactSpeeds, touching };
}
