import type { RankingRow } from '@/core/Ranking';

export interface TimingRowProps {
  row: RankingRow;
  /** El jugador activo: la fila va resaltada. */
  active: boolean;
}
