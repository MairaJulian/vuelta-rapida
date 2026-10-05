import type { SharedValue } from 'react-native-reanimated';

export interface LoopTestCanvasProps {
  /** Posición horizontal del rectángulo, en px. */
  x: SharedValue<number>;
  /** Texto del contador de fps. */
  fpsText: SharedValue<string>;
  /** Alto del lienzo, en px. Se usa para centrar el rectángulo. */
  height: number;
}
