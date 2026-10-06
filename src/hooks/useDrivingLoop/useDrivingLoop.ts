import type { Transforms3d } from '@shopify/react-native-skia';
import { useCallback, useEffect } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { createCameraState, getCameraView, stepCamera } from '@/core/Camera';
import type { CameraState } from '@/core/Camera';
import { createCarState } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';
import { advanceDrivingSim, createDrivingSim, getRenderCar } from '@/core/DrivingSim';
import type { DrivingSimState } from '@/core/DrivingSim';
import { DEFAULT_FIXED_STEP_CONFIG } from '@/core/FixedStep';
import { smoothFps } from '@/core/FpsMeter';
import { getStartPose } from '@/core/Track';
import type { TrackData } from '@/core/Track';

import type { UseDrivingLoopParams, UseDrivingLoopResult } from './useDrivingLoop.types';

function createStartSim(track: TrackData): DrivingSimState {
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
  const camera = useSharedValue<CameraState>(createCameraState());
  const fps = useSharedValue(0);
  const drivingConfigValue = useSharedValue(drivingConfig);
  const cameraConfigValue = useSharedValue(cameraConfig);
  const viewportValue = useSharedValue(viewport);
  const trackValue = useSharedValue(track);

  useEffect(() => drivingConfigValue.set(drivingConfig), [drivingConfigValue, drivingConfig]);
  useEffect(() => cameraConfigValue.set(cameraConfig), [cameraConfigValue, cameraConfig]);
  useEffect(() => viewportValue.set(viewport), [viewportValue, viewport]);
  useEffect(() => trackValue.set(track), [trackValue, track]);

  useFrameCallback((frame) => {
    'worklet';
    const frameMs = frame.timeSincePreviousFrame ?? 0;
    const next = advanceDrivingSim(
      sim.get(),
      frameMs,
      input.get(),
      drivingConfigValue.get(),
      trackValue.get(),
      DEFAULT_FIXED_STEP_CONFIG,
    );
    sim.set(next);
    const drawn = getRenderCar(next, DEFAULT_FIXED_STEP_CONFIG);
    car.set(drawn);
    // La cámara es presentación: se suaviza con el tiempo del cuadro, fuera de la simulación.
    camera.set(
      stepCamera(
        camera.get(),
        drawn,
        viewportValue.get(),
        cameraConfigValue.get(),
        drivingConfigValue.get().maxSpeed,
        frameMs / 1000,
      ),
    );
    fps.set(smoothFps(fps.get(), frameMs));
  });

  const cameraTransform = useDerivedValue<Transforms3d>(() => {
    const area = viewportValue.get();
    const view = getCameraView(
      car.get(),
      camera.get(),
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
    camera.set(createCameraState());
  }, [camera, car, sim, track]);

  return { car, fps, cameraTransform, carTransform, reset };
}
