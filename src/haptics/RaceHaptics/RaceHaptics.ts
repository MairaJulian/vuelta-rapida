import * as Haptics from 'expo-haptics';

import type { RaceEvent } from '@/core/RaceFlow';

import type {
  HapticImpact,
  HapticLevel,
  HapticMoment,
  RaceHaptics,
  RaceHapticsConfig,
  RaceHapticsOptions,
} from './RaceHaptics.types';

/** Intensidades iniciales: el piano apenas, el borde fuerte, la largada media y la llegada doble. */
export const DEFAULT_RACE_HAPTICS: RaceHapticsConfig = Object.freeze({
  kerb: 'light',
  border: 'heavy',
  start: 'medium',
  finish: 'double',
});

/** Intensidades en orden, con su nombre para el panel. */
export const HAPTIC_LEVELS: readonly { level: HapticLevel; label: string }[] = [
  { level: 'off', label: 'Apagada' },
  { level: 'light', label: 'Leve' },
  { level: 'medium', label: 'Media' },
  { level: 'heavy', label: 'Fuerte' },
  { level: 'double', label: 'Doble' },
];

/** Tiempo entre los dos golpes de `double`, en ms. */
export const DOUBLE_GAP_MS = 140;

const IMPACT_STYLES: Record<HapticImpact, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/** Algunos equipos no tienen motor de vibración: no es un error. */
function impactWithExpo(strength: HapticImpact) {
  Haptics.impactAsync(IMPACT_STYLES[strength]).catch(() => undefined);
}

/** El momento de cada evento que vibra. */
const MOMENTS: Partial<Record<RaceEvent['type'], HapticMoment>> = {
  kerbEnter: 'kerb',
  borderHit: 'border',
  lightsOut: 'start',
  finish: 'finish',
};

/** Con qué intensidad vibra un evento de la carrera; `null` si no vibra. */
export function getHapticLevel(event: RaceEvent, config: RaceHapticsConfig): HapticLevel | null {
  const moment = MOMENTS[event.type];
  const level = moment ? config[moment] : 'off';
  return level === 'off' ? null : level;
}

/** Vibraciones de la carrera sobre `expo-haptics` (o el `impact` que se pase). */
export function createRaceHaptics({
  impact = impactWithExpo,
}: RaceHapticsOptions = {}): RaceHaptics {
  let closed = false;
  let pending: ReturnType<typeof setTimeout> | null = null;

  return {
    pulse(level) {
      if (closed || level === 'off') {
        return;
      }
      if (level !== 'double') {
        impact(level);
        return;
      }
      impact('heavy');
      if (pending !== null) {
        clearTimeout(pending);
      }
      pending = setTimeout(() => {
        pending = null;
        if (!closed) {
          impact('heavy');
        }
      }, DOUBLE_GAP_MS);
    },

    close() {
      closed = true;
      if (pending !== null) {
        clearTimeout(pending);
        pending = null;
      }
    },
  };
}
