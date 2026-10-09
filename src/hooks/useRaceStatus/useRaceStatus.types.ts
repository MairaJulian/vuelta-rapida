import type { DerivedValue } from 'react-native-reanimated';

import type { EventBus } from '@/core/EventBus';
import type { RaceEvent, RaceLapView, RacePhase, RaceResults } from '@/core/RaceFlow';

export interface UseRaceStatusParams {
  /** Bus de la carrera: el estado sigue sus eventos. */
  bus: EventBus<RaceEvent>;
  /** Vuelta en curso (de `useRaceLoop`). Se lee una sola vez, al entrar en pausa. */
  lapView: DerivedValue<RaceLapView>;
  /** Espera entre la llegada y los resultados, en ms. Por defecto, `RESULTS_DELAY_MS`. */
  resultsDelayMs?: number;
}

export interface UseRaceStatusResult {
  /** Estado de la carrera según el último aviso `phase`. Empieza en `grid`. */
  phase: RacePhase;
  /** Vuelta y tiempo en el momento de pausar; `null` fuera de la pausa. */
  pausedLap: RaceLapView | null;
  /** Resultados, un rato después de la llegada; `null` antes y desde que se reinicia. */
  results: RaceResults | null;
}
