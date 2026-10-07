import type { SharedValue } from 'react-native-reanimated';

import type { TiltConfig, TiltSteeringResult } from '@/core/TiltSteering';

export interface CalibrationGaugeProps {
  /** Resultado de la inclinación en cada cuadro (de `useTiltSteering`). */
  output: SharedValue<TiltSteeringResult>;
  /** Zona muerta y sensibilidad, para la zona azul y las marcas de giro completo. */
  config: TiltConfig;
}

/** Posiciones sobre el arco, en grados desde arriba (a cada lado, simétricas). */
export interface GaugeMarks {
  /** Borde de la zona muerta. */
  deadZone: number;
  /** Giro completo. */
  fullTurn: number;
}

/** Punto en el lienzo del medidor, en dp. */
export interface GaugePoint {
  x: number;
  y: number;
}
