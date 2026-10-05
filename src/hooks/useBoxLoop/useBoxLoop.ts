import { useEffect } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { advanceBoxMotion } from '@/core/BoxMotion';
import type { BoxMotionConfig, BoxMotionState } from '@/core/BoxMotion';
import { smoothFps } from '@/core/FpsMeter';

import type { UseBoxLoopParams, UseBoxLoopResult } from './useBoxLoop.types';

/**
 * Conecta el loop de Reanimated (useFrameCallback) con la lógica pura de core.
 * No dibuja nada: solo expone valores compartidos para que el render los lea.
 */
export function useBoxLoop({ areaWidth, boxWidth, speed }: UseBoxLoopParams): UseBoxLoopResult {
  const motion = useSharedValue<BoxMotionState>({ x: 0, direction: 1 });
  const fps = useSharedValue(0);
  const config = useSharedValue<BoxMotionConfig>({ speed, boxWidth, areaWidth });

  useEffect(() => {
    config.value = { speed, boxWidth, areaWidth };
  }, [config, speed, boxWidth, areaWidth]);

  useFrameCallback((frame) => {
    'worklet';
    const dtMs = frame.timeSincePreviousFrame ?? 0;
    motion.value = advanceBoxMotion(motion.value, dtMs, config.value);
    fps.value = smoothFps(fps.value, dtMs);
  });

  const x = useDerivedValue(() => motion.value.x);
  const fpsText = useDerivedValue(() => `${Math.round(fps.value)} FPS`);

  return { x, fpsText };
}
