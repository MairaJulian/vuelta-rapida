import type { SharedValue } from 'react-native-reanimated';

export interface UseBoxLoopParams {
  /** Ancho del área de movimiento, en px. */
  areaWidth: number;
  /** Ancho del rectángulo, en px. */
  boxWidth: number;
  /** Velocidad en px por segundo. */
  speed: number;
}

export interface UseBoxLoopResult {
  /** Posición horizontal del rectángulo, actualizada cada cuadro. */
  x: SharedValue<number>;
  /** Texto del contador, por ejemplo "60 FPS". */
  fpsText: SharedValue<string>;
}
