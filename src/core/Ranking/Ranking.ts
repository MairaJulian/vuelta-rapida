import type { Profile, ProfilesState } from '@/core/Profiles';

import type {
  CelebrationKind,
  RaceRanking,
  RankingOutcome,
  RankingRow,
  RankingTable,
} from './Ranking.types';

/** La tabla de la mejor vuelta. */
export const LAP_TABLE: RankingTable = Object.freeze({ kind: 'lap' });

/** La tabla de la carrera completa con esa cantidad de vueltas. */
export function raceTable(laps: number): RankingTable {
  return { kind: 'race', laps };
}

export function isSameTable(a: RankingTable, b: RankingTable): boolean {
  return a.kind === b.kind && (a.kind === 'lap' || (b.kind === 'race' && a.laps === b.laps));
}

/** Nombre de una tabla para el jugador: "Mejor vuelta" o "Carrera · 3 vueltas". */
export function getTableLabel(table: RankingTable): string {
  if (table.kind === 'lap') {
    return 'Mejor vuelta';
  }
  return `Carrera · ${table.laps} ${table.laps === 1 ? 'vuelta' : 'vueltas'}`;
}

interface Entry {
  profileId: string;
  timeMs: number;
  setAt: number;
}

/** Entradas de una tabla en una pista: el mejor tiempo de cada perfil. */
function getEntries(state: ProfilesState, circuitId: string, table: RankingTable): Entry[] {
  if (table.kind === 'lap') {
    return state.lapRecords
      .filter((record) => record.circuitId === circuitId)
      .map(({ profileId, lapMs, setAt }) => ({ profileId, timeMs: lapMs, setAt }));
  }
  return state.raceRecords
    .filter((record) => record.circuitId === circuitId && record.laps === table.laps)
    .map(({ profileId, totalMs, setAt }) => ({ profileId, timeMs: totalMs, setAt }));
}

/**
 * La torre de tiempos de una tabla: un perfil por fila, ordenados por tiempo. Con el
 * mismo tiempo, primero quien lo logró antes. Las filas toman el nombre, el color y el
 * número actuales del perfil; las entradas de perfiles que no existen no aparecen.
 */
export function getRanking(
  state: ProfilesState,
  circuitId: string,
  table: RankingTable,
): RankingRow[] {
  const profiles = new Map(state.profiles.map((profile) => [profile.id, profile]));
  const sorted = getEntries(state, circuitId, table)
    .filter((entry) => profiles.has(entry.profileId))
    .sort(
      (a, b) => a.timeMs - b.timeMs || a.setAt - b.setAt || a.profileId.localeCompare(b.profileId),
    );
  const leader = sorted[0]?.timeMs ?? 0;
  return sorted.map((entry, i) => ({
    position: i + 1,
    profile: profiles.get(entry.profileId)!,
    timeMs: entry.timeMs,
    setAt: entry.setAt,
    gapToLeaderMs: entry.timeMs - leader,
    gapToAboveMs: i === 0 ? 0 : entry.timeMs - sorted[i - 1].timeMs,
  }));
}

/** El récord de la pista en una tabla (la fila del líder), o `null` si no hay tiempos. */
export function getTrackRecord(
  state: ProfilesState,
  circuitId: string,
  table: RankingTable,
): RankingRow | null {
  return getRanking(state, circuitId, table)[0] ?? null;
}

/** Cantidades de vueltas con tiempos de carrera en una pista, de menor a mayor. */
export function getRaceLapCounts(state: ProfilesState, circuitId: string): number[] {
  const laps = state.raceRecords
    .filter((record) => record.circuitId === circuitId)
    .map((record) => record.laps);
  return [...new Set(laps)].sort((a, b) => a - b);
}

/**
 * Cómo le fue a un jugador en una tabla: compara el ranking antes y después de correr.
 * - Mejor tiempo personal: mejoró su tiempo, o entró en la tabla.
 * - Superó a otros: los que ahora tiene detrás y antes no (estaban adelante, o él no
 *   estaba en la tabla). Solo cuenta si mejoró su tiempo.
 * - Récord de la pista: mejoró, quedó primero y hay al menos otro jugador.
 */
export function getRankingOutcome(
  before: ProfilesState,
  after: ProfilesState,
  profileId: string,
  circuitId: string,
  table: RankingTable,
): RankingOutcome {
  const rowsBefore = getRanking(before, circuitId, table);
  const rowsAfter = getRanking(after, circuitId, table);
  const mine = (rows: RankingRow[]) => rows.find((row) => row.profile.id === profileId) ?? null;
  const was = mine(rowsBefore);
  const now = mine(rowsAfter);
  const personalBest = now !== null && (was === null || now.timeMs < was.timeMs);
  const positionBefore = new Map(rowsBefore.map((row) => [row.profile.id, row.position]));
  const overtaken: Profile[] =
    personalBest && now
      ? rowsAfter
          .filter((row) => row.position > now.position)
          .filter((row) => {
            const theirs = positionBefore.get(row.profile.id);
            return was === null || (theirs !== undefined && theirs < was.position);
          })
          .map((row) => row.profile)
      : [];
  const above = now && now.position > 1 ? rowsAfter[now.position - 2] : null;
  return {
    table,
    position: now?.position ?? null,
    previousPosition: was?.position ?? null,
    total: rowsAfter.length,
    personalBest,
    overtaken,
    trackRecord: personalBest && now?.position === 1 && rowsAfter.length > 1,
    above,
    gapToAboveMs: above && now ? now.gapToAboveMs : null,
  };
}

/**
 * Cómo le fue a un jugador con una carrera de `laps` vueltas: las dos tablas de la pista
 * (mejor vuelta y carrera completa) y la celebración más grande.
 */
export function getRaceRanking(
  before: ProfilesState,
  after: ProfilesState,
  profileId: string,
  circuitId: string,
  laps: number,
): RaceRanking {
  const lap = getRankingOutcome(before, after, profileId, circuitId, LAP_TABLE);
  const race = getRankingOutcome(before, after, profileId, circuitId, raceTable(laps));
  return { lap, race, celebration: getCelebration([lap, race]) };
}

/**
 * La celebración más grande entre varias tablas: récord de la pista, superar a otro
 * jugador o mejor tiempo personal; `null` si no hubo ninguna.
 */
export function getCelebration(outcomes: readonly RankingOutcome[]): CelebrationKind | null {
  if (outcomes.some((outcome) => outcome.trackRecord)) {
    return 'trackRecord';
  }
  if (outcomes.some((outcome) => outcome.overtaken.length > 0)) {
    return 'overtake';
  }
  if (outcomes.some((outcome) => outcome.personalBest)) {
    return 'personalBest';
  }
  return null;
}
