import type { SharedValue } from 'react-native-reanimated';

import type { DrivingInput } from '@/core/DrivingModel';
import type { TiltConfig, TiltSteeringResult } from '@/core/TiltSteering';

export interface UseTiltSteeringParams {
  /** Calibración, zona muerta, sensibilidad y filtro. Se pueden cambiar en caliente. */
  config: TiltConfig;
  /** Si se pasa, cada cuadro escribe la dirección en la entrada (sin tocar el freno). */
  input?: SharedValue<DrivingInput>;
  /**
   * Dónde publicar el resultado de cada cuadro. Si no se pasa, el hook crea el suyo.
   * Pasarlo permite que otra pieza (el panel) lo lea: lo posee la pantalla.
   */
  output?: SharedValue<TiltSteeringResult>;
}

export interface UseTiltSteeringResult {
  /** Último resultado: dirección, ángulo calibrado, confianza y estado del filtro. */
  output: SharedValue<TiltSteeringResult>;
  /** Devuelve `config` con el ángulo actual como nuevo "derecho" (sin lecturas, igual). */
  calibrate: (config: TiltConfig) => TiltConfig;
}
