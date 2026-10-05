import type { Radians } from './MathUtils.types';

const TWO_PI = Math.PI * 2;

/** Limita `value` al rango [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** Interpolación lineal: t = 0 devuelve `from`, t = 1 devuelve `to`. */
export function lerp(from: number, to: number, t: number): number {
  'worklet';
  return from + (to - from) * t;
}

/** Normaliza un ángulo al rango (-π, π]. */
export function wrapAngle(angle: Radians): Radians {
  'worklet';
  let wrapped = angle % TWO_PI;
  if (wrapped <= -Math.PI) {
    wrapped += TWO_PI;
  } else if (wrapped > Math.PI) {
    wrapped -= TWO_PI;
  }
  return wrapped;
}

/** Interpola dos ángulos por el arco más corto (cruza ±π sin dar la vuelta entera). */
export function lerpAngle(from: Radians, to: Radians, t: number): Radians {
  'worklet';
  return wrapAngle(from + wrapAngle(to - from) * t);
}
