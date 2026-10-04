import type { BoxMotionConfig, BoxMotionState } from './BoxMotion.types';

/**
 * Avanza un rectángulo que rebota entre los bordes del área.
 * Función pura y sin imports de React/Skia. La directiva 'worklet' permite llamarla
 * desde el hilo de UI de Reanimated sin acoplar este módulo a esa librería.
 */
export function advanceBoxMotion(
  state: BoxMotionState,
  dtMs: number,
  config: BoxMotionConfig,
): BoxMotionState {
  'worklet';
  if (dtMs <= 0) {
    return state;
  }

  const maxX = Math.max(0, config.areaWidth - config.boxWidth);
  let x = state.x + state.direction * config.speed * (dtMs / 1000);
  let direction = state.direction;

  if (x >= maxX) {
    x = maxX - (x - maxX);
    direction = -1;
  } else if (x <= 0) {
    x = -x;
    direction = 1;
  }

  return { x: Math.min(Math.max(x, 0), maxX), direction };
}
