import type { EventBus } from '@/core/EventBus';
import type { RaceEvent } from '@/core/RaceFlow';

export interface UseGhostRecordingParams {
  /** El bus de la carrera: el evento `recordTrace` de la vuelta que mejora el récord. */
  bus: EventBus<RaceEvent>;
  /** Pista de la carrera. */
  circuitId: string;
  /** Pasos de simulación por segundo, para pasar los pasos de la vuelta a milisegundos. */
  stepHz: number;
}
