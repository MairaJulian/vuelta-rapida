import { clamp } from '@/core/MathUtils';

import type { FixedStepConfig, FixedStepResult } from './FixedStep.types';

export const DEFAULT_FIXED_STEP_CONFIG: FixedStepConfig = {
  stepHz: 60,
  maxFrameMs: 100,
};

/**
 * Tolerancia para errores de redondeo: 60 cuadros de 1000/60 ms deben dar
 * exactamente 60 pasos aunque la suma en coma flotante quede un pelo corta.
 */
const EPSILON_MS = 1e-6;

/** Duración de un paso fijo, en ms. */
export function getStepMs(config: FixedStepConfig): number {
  'worklet';
  return 1000 / config.stepHz;
}

/**
 * Suma el tiempo del cuadro al acumulador y devuelve cuántos pasos fijos
 * corresponden. Cuadros inválidos (0, negativos, no finitos) no aportan tiempo.
 */
export function consumeFrameTime(
  accumulatorMs: number,
  frameMs: number,
  config: FixedStepConfig,
): FixedStepResult {
  'worklet';
  const stepMs = getStepMs(config);
  const frame = Number.isFinite(frameMs) ? clamp(frameMs, 0, config.maxFrameMs) : 0;
  let remaining = accumulatorMs + frame;
  let steps = 0;
  while (remaining + EPSILON_MS >= stepMs) {
    remaining -= stepMs;
    steps += 1;
  }
  return { steps, accumulatorMs: Math.max(remaining, 0) };
}

/** Fracción del próximo paso ya transcurrida, en [0, 1). Se usa para interpolar el render. */
export function getStepAlpha(accumulatorMs: number, config: FixedStepConfig): number {
  'worklet';
  const alpha = accumulatorMs / getStepMs(config);
  return clamp(alpha, 0, 1 - EPSILON_MS);
}
