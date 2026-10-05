import type { Transforms3d } from '@shopify/react-native-skia';
import { useCallback, useEffect } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { getCameraView } from '@/core/Camera';
import { createCarState } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';
import { advanceDrivingSim, createDrivingSim, getRenderCar } from '@/core/DrivingSim';
import type { DrivingSimState } from '@/core/DrivingSim';
import { DEFAULT_FIXED_STEP_CONFIG } from '@/core/FixedStep';
import { smoothFps } from '@/core/FpsMeter';
import { getStartPose } from '@/core/Track';
import type { OvalTrack } from '@/core/Track';

import type { UseDrivingLoopParams, UseDrivingLoopResult } from './useDrivingLoop.types';

function createStartSim(track: OvalTrack): DrivingSimState {
  const start = getStartPose(track);
  return createDrivingSim(createCarState(start.x, start.z, start.heading));
}

/**
 * Corre la simulación de manejo en el hilo de UI, un paso fijo a la vez, y expone
 * valores compartidos para que el render los lea. No dibuja nada.
 */
export function useDrivingLoop({
  input,
  track,
  viewport,
  drivingConfig,
  cameraConfig,
}: UseDrivingLoopParams): UseDrivingLoopResult {
  const initialSim = createStartSim(track);
  const sim = useSharedValue<DrivingSimState>(initialSim);
  const car = useSharedValue<CarState>(initialSim.car);
  const fps = useSharedValue(0);
  const drivingConfigValue = useSharedValue(drivingConfig);
  const cameraConfigValue = useSharedValue(cameraConfig);
  const viewportValue = useSharedValue(viewport);

  useEffect(() => drivingConfigValue.set(drivingConfig), [drivingConfigValue, drivingConfig]);
  useEffect(() => cameraConfigValue.set(cameraConfig), [cameraConfigValue, cameraConfig]);
  useEffect(() => viewportValue.set(viewport), [viewportValue, viewport]);

  useFrameCallback((frame) => {
    'worklet';
    const frameMs = frame.timeSincePreviousFrame ?? 0;
    const next = advanceDrivingSim(
      sim.get(),
      frameMs,
      input.get(),
      drivingConfigValue.get(),
      DEFAULT_FIXED_STEP_CONFIG,
    );
    sim.set(next);
    car.set(getRenderCar(next, DEFAULT_FIXED_STEP_CONFIG));
    fps.set(smoothFps(fps.get(), frameMs));
  });

  const cameraTransform = useDerivedValue<Transforms3d>(() => {
    const area = viewportValue.get();
    const view = getCameraView(
      car.get(),
      area,
      cameraConfigValue.get(),
      drivingConfigValue.get().maxSpeed,
    );
    return [
      { translateX: area.width / 2 },
      { translateY: area.height / 2 },
      { rotate: -view.rotation },
      { scale: view.scale },
      { translateX: -view.targetX },
      { translateY: -view.targetZ },
    ];
  });

  const carTransform = useDerivedValue<Transforms3d>(() => {
    const current = car.get();
    return [{ translateX: current.x }, { translateY: current.z }, { rotate: current.heading }];
  });

  const reset = useCallback(() => {
    const fresh = createStartSim(track);
    sim.set(fresh);
    car.set(fresh.car);
  }, [car, sim, track]);

  return { car, fps, cameraTransform, carTransform, reset };
}
