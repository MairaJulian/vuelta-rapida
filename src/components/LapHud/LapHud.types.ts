import type { StyleProp, ViewStyle } from 'react-native';
import type { DerivedValue } from 'react-native-reanimated';

import type { RaceLapView } from '@/core/RaceFlow';

export interface LapHudProps {
  /** Vuelta en curso, total de vueltas y tiempo de la vuelta (de `useRaceLoop`). */
  lapView: DerivedValue<RaceLapView>;
  /** Récord guardado del circuito, en milisegundos; `null` si todavía no hay. */
  recordMs: number | null;
  /** Pasos de simulación por segundo, para pasar los pasos a tiempo. */
  stepHz: number;
  /**
   * Diferencia con el auto fantasma, en segundos (positiva: el jugador va atrás; de
   * `useRaceGhost`). Con un número se muestra el chip de diferencia; con `null`, o sin
   * esta prop, no.
   */
  ghostDelta?: DerivedValue<number | null>;
  /** Abre la pausa. Sin esta prop no hay botón de pausa. */
  onPause?: () => void;
  /** Estilo extra del contenedor (ocupa todo el ancho, arriba). */
  style?: StyleProp<ViewStyle>;
}

/** Textos del HUD, ya formateados. */
export interface LapHudTexts {
  lap: string;
  /** Total de vueltas con la barra: "/3". */
  totalLaps: string;
  time: string;
  best: string;
}

/** Chip de diferencia con el fantasma, ya formateado. */
export interface GhostDeltaChip {
  /** Con signo siempre: "−0.412" (a favor) o "+0.236" (en contra). */
  text: string;
  /** `true` si el jugador va más rápido que el fantasma. */
  faster: boolean;
}
