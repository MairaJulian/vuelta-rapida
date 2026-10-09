import type { Transforms3d } from '@shopify/react-native-skia';
import { useCallback, useEffect, useState } from 'react';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { createCameraState, getCameraView, stepCamera } from '@/core/Camera';
import type { CameraState } from '@/core/Camera';
import { createCarState, getSpeed } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';
import { getRenderCar } from '@/core/DrivingSim';
import { DEFAULT_FIXED_STEP_CONFIG } from '@/core/FixedStep';
import { smoothFps } from '@/core/FpsMeter';
import {
  advanceRace,
  createRace,
  getRaceLapView,
  pauseRace,
  restartRace,
  resumeRace,
  startLights as startRaceLights,
  takeRaceEvents,
} from '@/core/RaceFlow';
import type { RaceConfig, RaceSetup, RaceState } from '@/core/RaceFlow';
import { getStartPose } from '@/core/Track';
import type { Circuit } from '@/core/Track';

import type { UseRaceLoopParams, UseRaceLoopResult } from './useRaceLoop.types';

/** Cada cuánto se manda la velocidad al sonido del motor, en ms (unas 20 veces por segundo). */
export const ENGINE_SAMPLE_MS = 50;

const defaultSeed = () => Date.now();

function createSetup(
  track: Circuit,
  config: RaceConfig,
  recordTicks: number | null,
  seed: number,
): RaceSetup {
  const start = getStartPose(track);
  return {
    car: createCarState(start.x, start.z, start.heading),
    seed,
    recordTicks,
    stepHz: DEFAULT_FIXED_STEP_CONFIG.stepHz,
    config,
  };
}

/**
 * Corre la carrera en el hilo de UI, un paso fijo a la vez: el semáforo, el auto,
 * las vueltas y la llegada (`core/RaceFlow`). Expone valores compartidos para el
 * render y el HUD, entrega los eventos al hilo de JS y recibe las órdenes de la
 * pantalla (semáforo, pausa, reinicio). No dibuja nada.
 */
export function useRaceLoop({
  input,
  track,
  viewport,
  drivingConfig,
  cameraConfig,
  raceConfig,
  recordTicks,
  onEvents,
  onEngine,
  createSeed = defaultSeed,
}: UseRaceLoopParams): UseRaceLoopResult {
  // La primera carrera se arma una sola vez; las siguientes, con `restart`.
  const [initialRace] = useState(() =>
    createRace(createSetup(track, raceConfig, recordTicks, createSeed())),
  );
  const race = useSharedValue<RaceState>(initialRace);
  const car = useSharedValue<CarState>(initialRace.sim.car);
  const camera = useSharedValue<CameraState>(createCameraState());
  const fps = useSharedValue(0);
  const engineClock = useSharedValue(0);
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
    const config = drivingConfigValue.get();
    const advanced = advanceRace(
      race.get(),
      frameMs,
      input.get(),
      config,
      trackValue.get(),
      DEFAULT_FIXED_STEP_CONFIG,
    );
    const { race: next, events } = takeRaceEvents(advanced);
    race.set(next);
    if (onEvents && events.length > 0) {
      scheduleOnRN(onEvents, events);
    }
    const drawn = getRenderCar(next.sim, DEFAULT_FIXED_STEP_CONFIG);
    car.set(drawn);
    if (onEngine) {
      const elapsed = engineClock.get() + frameMs;
      if (elapsed >= ENGINE_SAMPLE_MS) {
        engineClock.set(0);
        const ratio = config.maxSpeed > 0 ? Math.min(getSpeed(drawn) / config.maxSpeed, 1) : 0;
        scheduleOnRN(onEngine, ratio);
      } else {
        engineClock.set(elapsed);
      }
    }
    // La cámara es presentación: se suaviza con el tiempo del cuadro, fuera de la simulación.
    camera.set(
      stepCamera(
        camera.get(),
        drawn,
        viewportValue.get(),
        cameraConfigValue.get(),
        config.maxSpeed,
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

  const lapView = useDerivedValue(() => getRaceLapView(race.get()));

  const carTransform = useDerivedValue<Transforms3d>(() => {
    const current = car.get();
    return [{ translateX: current.x }, { translateY: current.z }, { rotate: current.heading }];
  });

  // Las órdenes corren en el hilo de UI entre dos cuadros (`modify`), así no pisan la simulación.
  const startLights = useCallback(() => {
    race.modify((current) => {
      'worklet';
      return startRaceLights(current);
    });
  }, [race]);

  const pause = useCallback(() => {
    race.modify((current) => {
      'worklet';
      return pauseRace(current);
    });
  }, [race]);

  const resume = useCallback(() => {
    race.modify((current) => {
      'worklet';
      return resumeRace(current);
    });
  }, [race]);

  const restart = useCallback(() => {
    const setup = createSetup(track, raceConfig, recordTicks, createSeed());
    race.modify((current) => {
      'worklet';
      return restartRace(current, setup);
    });
    car.set(setup.car);
    camera.set(createCameraState());
  }, [camera, car, createSeed, race, raceConfig, recordTicks, track]);

  return {
    race,
    car,
    fps,
    cameraTransform,
    carTransform,
    lapView,
    startLights,
    pause,
    resume,
    restart,
  };
}
