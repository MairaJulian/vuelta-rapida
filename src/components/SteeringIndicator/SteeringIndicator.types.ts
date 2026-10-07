import type { StyleProp, ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { TiltConfig, TiltSteeringResult } from '@/core/TiltSteering';

export interface SteeringIndicatorProps {
  /** Resultado de la inclinación en cada cuadro (de `useTiltSteering`). */
  output: SharedValue<TiltSteeringResult>;
  /** Zona muerta y sensibilidad, para la franja y las marcas de giro completo. */
  config: TiltConfig;
  /** Ubicación en la pantalla (la píldora no se posiciona sola). */
  style?: StyleProp<ViewStyle>;
}
