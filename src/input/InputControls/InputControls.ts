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
