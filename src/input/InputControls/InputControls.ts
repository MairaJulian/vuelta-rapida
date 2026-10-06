import * as Haptics from 'expo-haptics';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { DrivingInput } from '@/core/DrivingModel';

/** Sin dirección ni freno: el auto acelera en línea recta. */
export const NEUTRAL_INPUT: DrivingInput = Object.freeze({ steer: 0, brake: 0 });

/**
 * Crea el valor compartido de entrada. Lo posee la pantalla: se lo pasa al modo
 * de control (que lo escribe) y al loop de la simulación (que lo lee).
 */
export function useDrivingInput(): SharedValue<DrivingInput> {
  return useSharedValue<DrivingInput>(NEUTRAL_INPUT);
}

/** Vibración corta al empezar a frenar. Algunos equipos no tienen motor de vibración: no es un error. */
export function vibrateOnBrake() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/**
 * Gesto de "mantener presionado": empieza al apoyar el dedo y termina al
 * levantarlo. Cada botón tiene el suyo, así que funcionan con dedos distintos a
 * la vez. `onChange` corre en el hilo de UI.
 */
export function createHoldGesture(testId: string, onChange: (isDown: boolean) => void) {
  return Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      onChange(true);
    })
    .onFinalize(() => {
      'worklet';
      onChange(false);
    })
    .withTestId(testId);
}
