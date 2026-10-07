import type { StyleProp, ViewStyle } from 'react-native';
import type { DerivedValue } from 'react-native-reanimated';

import type { LapState } from '@/core/LapTimer';

export interface LapHudProps {
  /** Vueltas de la simulación (de `useDrivingLoop`). */
  laps: DerivedValue<LapState>;
  /** Récord guardado del circuito, en milisegundos; `null` si todavía no hay. */
  recordMs: number | null;
  /** Pasos de simulación por segundo, para pasar los pasos a tiempo. */
  stepHz: number;
  /** Estilo extra del contenedor (ocupa todo el ancho, arriba). */
  style?: StyleProp<ViewStyle>;
}

/** Textos del HUD, ya formateados. */
export interface LapHudTexts {
  lap: string;
  time: string;
  best: string;
}
