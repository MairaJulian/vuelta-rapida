import type { SharedValue } from 'react-native-reanimated';

import type { TiltConfig, TiltSteeringResult } from '@/core/TiltSteering';

export interface CalibrationGaugeProps {
  /** Resultado de la inclinación en cada cuadro (de `useTiltSteering`). */
  output: SharedValue<TiltSteeringResult>;
  /** Zona muerta y sensibilidad, para la escala del arco. */
  config: TiltConfig;
}

/** Punto en el lienzo del medidor, en dp. */
export interface GaugePoint {
  x: number;
  y: number;
}
