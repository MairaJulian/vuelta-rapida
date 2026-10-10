import { clamp } from '@/core/MathUtils';

import type { GearboxConfig, GearboxPace, GearboxStep, GearShift } from './EngineGears.types';

/** Bajar de marcha cuando la de abajo quedaría con 70 % de revoluciones o menos. */
const DOWNSHIFT_RPM = 0.7;

const gearbox = (gearTopSpeeds: number[]): GearboxConfig =>
  Object.freeze({ gearTopSpeeds: Object.freeze(gearTopSpeeds), downshiftRpm: DOWNSHIFT_RPM });

/**
 * Seis marchas, con tres ritmos para probar. El auto llega a la velocidad máxima a los
 * 3,8 s, así que la quinta tiene que llegar al corte antes. La sexta es larga en los
 * tres: a velocidad máxima el motor gira al 85 % (1 / 1,18), por debajo del corte.
 * - `quick`: cambia a los 0,45; 0,8; 1,2; 1,7 y 2,4 s (la primera versión).
 * - `medium` y `slow`: los cambios caen al 17, 34, 52, 74 y 100 % del tiempo hasta la
 *   sexta (3 o 3,5 s). Cortes calculados con la física por defecto del auto.
 */
export const GEARBOXES: Readonly<Record<GearboxPace, GearboxConfig>> = Object.freeze({
  quick: gearbox([0.2, 0.34, 0.48, 0.62, 0.78, 1.18]),
  medium: gearbox([0.226, 0.408, 0.576, 0.736, 0.886, 1.18]),
  slow: gearbox([0.258, 0.462, 0.641, 0.811, 0.962, 1.18]),
});

/** Los ritmos, del más rápido al más lento. */
export const GEARBOX_PACES: readonly GearboxPace[] = Object.freeze(['quick', 'medium', 'slow']);

/**
 * A sexta a los 3,5 s, elegido probando en el celular: con 2,5 s los primeros cambios se
 * escuchaban demasiado seguidos.
 */
export const DEFAULT_GEARBOX_PACE: GearboxPace = 'slow';

export const DEFAULT_GEARBOX: GearboxConfig = GEARBOXES[DEFAULT_GEARBOX_PACE];

/** Revoluciones de una marcha a una velocidad dada: 0 detenido, 1 en el corte. */
export function getGearRpm(speedRatio: number, gear: number, config: GearboxConfig): number {
  const top = config.gearTopSpeeds[gear];
  return top > 0 ? clamp(speedRatio / top, 0, 1) : 0;
}

/**
 * Un paso de la caja: la marcha que corresponde a la velocidad, partiendo de la
 * actual, y las revoluciones en esa marcha.
 * - Sube al llegar al corte de la marcha actual.
 * - Baja cuando la marcha de abajo quedaría con `downshiftRpm` o menos.
 * - Si la velocidad cambió mucho (un choque, un reinicio), salta varias marchas de una.
 */
export function stepGearbox(
  currentGear: number,
  speedRatio: number,
  config: GearboxConfig,
): GearboxStep {
  const last = config.gearTopSpeeds.length - 1;
  const speed = clamp(speedRatio, 0, 1);
  const start = clamp(Math.round(currentGear), 0, last);
  let gear = start;
  while (gear < last && speed >= config.gearTopSpeeds[gear]) {
    gear += 1;
  }
  while (gear > 0 && speed < config.downshiftRpm * config.gearTopSpeeds[gear - 1]) {
    gear -= 1;
  }
  let shift: GearShift = null;
  if (gear > start) {
    shift = 'up';
  } else if (gear < start) {
    shift = 'down';
  }
  return { gear, rpm: getGearRpm(speed, gear, config), shift };
}
