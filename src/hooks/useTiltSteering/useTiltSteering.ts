import { Accelerometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect } from 'react';
import {
  SensorType,
  useAnimatedSensor,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue, Value3D } from 'react-native-reanimated';

import { calibrateTilt, createTiltState, stepTiltSteering } from '@/core/TiltSteering';
import type {
  GravityReading,
  ScreenRotation,
  TiltConfig,
  TiltSteeringResult,
} from '@/core/TiltSteering';

import type { UseTiltSteeringParams, UseTiltSteeringResult } from './useTiltSteering.types';

/** Una lectura por cuadro a 60 Hz: más seguido no cambia nada y gasta batería. */
export const SENSOR_INTERVAL_MS = 16;

/** Si en este tiempo no llegó ninguna lectura de gravedad, el celular no tiene ese sensor. */
export const FALLBACK_DELAY_MS = 500;

/** Resultado antes de la primera lectura: derecho y sin confianza. */
export const IDLE_TILT_RESULT: TiltSteeringResult = {
  state: createTiltState(),
  steer: 0,
  relativeAngle: 0,
  confidence: 0,
};

/** Rotación de pantalla según expo-screen-orientation, en un celular (natural en vertical). */
export function orientationToRotation(orientation: ScreenOrientation.Orientation): ScreenRotation {
  switch (orientation) {
    case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
      return 90;
    case ScreenOrientation.Orientation.PORTRAIT_DOWN:
      return 180;
    case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
      return 270;
    default:
      return 0;
  }
}

/**
 * Respaldo para celulares sin sensor de gravedad (en Android, este sensor necesita
 * giroscopio). Si a los `FALLBACK_DELAY_MS` no llegó ninguna lectura, escucha el
 * acelerómetro de expo-sensors y escribe en `fallback`. Corre en el hilo de JS: es
 * un camino de respaldo, el filtro de `core` se encarga de las sacudidas.
 */
function useAccelerometerFallback(
  gravity: SharedValue<Value3D>,
  fallback: SharedValue<GravityReading | null>,
) {
  useEffect(() => {
    let rotation: ScreenRotation = 90;
    let accelerometer: { remove: () => void } | null = null;
    let orientation: { remove: () => void } | null = null;

    const timer = setTimeout(() => {
      const sample = gravity.get();
      if (Math.hypot(sample.x, sample.y, sample.z) > 0) {
        return;
      }
      ScreenOrientation.getOrientationAsync()
        .then((current) => {
          rotation = orientationToRotation(current);
        })
        .catch(() => undefined);
      orientation = ScreenOrientation.addOrientationChangeListener((event) => {
        rotation = orientationToRotation(event.orientationInfo.orientation);
      });
      Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
      accelerometer = Accelerometer.addListener(({ x, y, z }) => {
        // El acelerómetro mide la reacción al peso (apunta hacia arriba); la gravedad, al revés.
        fallback.set({ x: -x, y: -y, z: -z, rotation });
      });
    }, FALLBACK_DELAY_MS);

    return () => {
      clearTimeout(timer);
      accelerometer?.remove();
      orientation?.remove();
      fallback.set(null);
    };
  }, [gravity, fallback]);
}

/**
 * Lee el sensor de gravedad y lo convierte en dirección con `core/TiltSteering`,
 * una vez por cuadro en el hilo de UI. No dibuja nada.
 *
 * El sensor se registra **sin** el ajuste automático por orientación de Reanimated:
 * la única corrección por orientación es la de `toScreenGravity`, en `core`.
 */
export function useTiltSteering({
  config,
  input,
  output,
}: UseTiltSteeringParams): UseTiltSteeringResult {
  const ownOutput = useSharedValue<TiltSteeringResult>(IDLE_TILT_RESULT);
  const result = output ?? ownOutput;
  const configValue = useSharedValue(config);
  const fallback = useSharedValue<GravityReading | null>(null);

  useEffect(() => configValue.set(config), [configValue, config]);

  const gravity = useAnimatedSensor(SensorType.GRAVITY, {
    interval: SENSOR_INTERVAL_MS,
    adjustToInterfaceOrientation: false,
  });
  useAccelerometerFallback(gravity.sensor, fallback);

  useFrameCallback((frame) => {
    'worklet';
    const sample = gravity.sensor.get();
    const reading = fallback.get() ?? {
      x: sample.x,
      y: sample.y,
      z: sample.z,
      rotation: sample.interfaceOrientation as ScreenRotation,
    };
    const dt = (frame.timeSincePreviousFrame ?? 0) / 1000;
    const next = stepTiltSteering(result.get().state, reading, configValue.get(), dt);
    result.set(next);
    if (input) {
      const current = input.get();
      if (current.steer !== next.steer) {
        input.set({ steer: next.steer, brake: current.brake });
      }
    }
  });

  const calibrate = useCallback(
    (current: TiltConfig) => calibrateTilt(result.get().state, current),
    [result],
  );

  return { output: result, calibrate };
}

/** Crea el valor compartido donde un modo de inclinación publica su resultado. */
export function useTiltOutput(): SharedValue<TiltSteeringResult> {
  return useSharedValue<TiltSteeringResult>(IDLE_TILT_RESULT);
}
