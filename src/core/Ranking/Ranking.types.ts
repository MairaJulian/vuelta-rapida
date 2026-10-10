import type { Profile } from '@/core/Profiles';

/** Una tabla del ranking de una pista: la mejor vuelta, o la carrera completa con N vueltas. */
export type RankingTable = { kind: 'lap' } | { kind: 'race'; laps: number };

/** Una fila de la torre de tiempos. */
export interface RankingRow {
  /** Puesto, desde 1. */
  position: number;
  /** El perfil, con su nombre, color y número actuales. */
  profile: Profile;
  /** Su mejor tiempo en la tabla, en milisegundos. */
  timeMs: number;
  /** Cuándo lo marcó: con el mismo tiempo, gana quien lo logró primero. */
  setAt: number;
  /** Diferencia con el líder, en milisegundos (0 para el líder). */
  gapToLeaderMs: number;
  /** Diferencia con el puesto de arriba, en milisegundos (0 para el líder). */
  gapToAboveMs: number;
}

/** Cómo le fue a un jugador en una tabla: compara el ranking antes y después de correr. */
export interface RankingOutcome {
  table: RankingTable;
  /** Su puesto después de correr; `null` si no está en la tabla. */
  position: number | null;
  /** Su puesto antes de correr; `null` si no estaba. */
  previousPosition: number | null;
  /** Cuántos jugadores hay en la tabla después de correr. */
  total: number;
  /** Mejoró su tiempo en la tabla (o entró por primera vez). */
  personalBest: boolean;
  /** Jugadores que estaban adelante (o que él no tenía detrás) y ahora quedaron atrás. */
  overtaken: Profile[];
  /**
   * Nuevo récord de la pista: mejoró, quedó primero y hay al menos otro jugador en la
   * tabla. Solo, cuenta como mejor tiempo personal.
   */
  trackRecord: boolean;
  /** La fila de arriba después de correr; `null` si es primero o no está. */
  above: RankingRow | null;
  /** Cuánto le falta para alcanzar al de arriba, en milisegundos; `null` si es primero. */
  gapToAboveMs: number | null;
}

/** Celebraciones, de la más grande a la más chica. */
export type CelebrationKind = 'trackRecord' | 'overtake' | 'personalBest';

/** Cómo le fue a un jugador en el ranking de la pista con una carrera. */
export interface RaceRanking {
  /** Tabla de la mejor vuelta. */
  lap: RankingOutcome;
  /** Tabla de la carrera completa, con las vueltas de esa carrera. */
  race: RankingOutcome;
  /** La celebración más grande de las dos tablas, o `null`. */
  celebration: CelebrationKind | null;
}
