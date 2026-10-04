import type { FramesPerSecond, Milliseconds } from './FpsMeter.types';

/**
 * Suaviza la lectura de fps con una media móvil exponencial.
 * Función pura y sin imports de React/Skia ('worklet' para usarla desde Reanimated).
 *
 * @param previousFps lectura anterior; 0 significa "sin muestras todavía".
 * @param dtMs tiempo del último cuadro en ms.
 * @param smoothing peso de la muestra nueva, entre 0 y 1.
 */
export function smoothFps(
  previousFps: FramesPerSecond,
  dtMs: Milliseconds,
  smoothing = 0.1,
): FramesPerSecond {
  'worklet';
  if (dtMs <= 0) {
    return previousFps;
  }
  const instantFps = 1000 / dtMs;
  if (previousFps <= 0) {
    return instantFps;
  }
  return previousFps + (instantFps - previousFps) * smoothing;
}
