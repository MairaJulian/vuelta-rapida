import type { RankingRow } from '@/core/Ranking';
import type { Circuit } from '@/core/Track';

export interface TrackCardProps {
  circuit: Circuit;
  /** La pista elegida: borde azul e ilustración azul con el trazado blanco. */
  selected: boolean;
  /** Récord de la pista (mejor vuelta), con quién lo tiene; `null` si no hay tiempos. */
  record: RankingRow | null;
  onPress: () => void;
}
