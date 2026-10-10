import type { EventBus } from '@/core/EventBus';
import type { RaceEvent } from '@/core/RaceFlow';
import type { RaceRanking } from '@/core/Ranking';

export interface UseRaceRankingParams {
  /** El bus de la carrera: la largada, la llegada y la vuelta a la grilla. */
  bus: EventBus<RaceEvent>;
  /** Pista de la carrera. */
  circuitId: string;
  /** Pasos de simulación por segundo, para pasar el total a milisegundos. */
  stepHz: number;
}

export interface UseRaceRankingResult {
  /**
   * Cómo le fue en las dos tablas de la pista y la celebración. Después de la llegada,
   * con perfil activo; `null` antes, sin perfil o al volver a largar.
   */
  ranking: RaceRanking | null;
}
