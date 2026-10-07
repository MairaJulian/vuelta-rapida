import type { SharedValue } from 'react-native-reanimated';

import type { TiltConfig, TiltSteeringResult } from '@/core/TiltSteering';
import type { InputControlsProps } from '@/input/InputControls';

export interface TiltControlsProps extends InputControlsProps {
  /** Calibración, zona muerta, sensibilidad y filtro. Se pueden cambiar en caliente. */
  config: TiltConfig;
  /**
   * Dónde publicar el resultado de la inclinación en cada cuadro. Lo posee la
   * pantalla, para que el panel lo lea y pueda recalibrar. Opcional.
   */
  output?: SharedValue<TiltSteeringResult>;
}

/** Qué freno lateral está presionado en este momento. */
export interface PressedBrakes {
  left: boolean;
  right: boolean;
}

export type BrakeSide = keyof PressedBrakes;
