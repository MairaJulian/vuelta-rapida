import type { RaceResults } from '@/core/RaceFlow';
import type { RaceRanking } from '@/core/Ranking';

export interface RaceResultsProps {
  /** Resultado de la carrera, en pasos de simulación. */
  results: RaceResults;
  /** Pasos por segundo, para pasar los pasos a tiempo. */
  stepHz: number;
  /** Nombre del circuito. */
  circuitName: string;
  /** Quién corrió: encabeza la columna de vueltas ("MALE · #27"). Sin piloto, "Tus vueltas". */
  driver?: { name: string; number: number } | null;
  /**
   * Cómo le fue en el ranking de la pista: el puesto en las dos tablas y la celebración,
   * que decide el título, la tarjeta lima y los papelitos. Sin ranking (sin perfil), la
   * tarjeta celebra solo el récord personal de vuelta.
   */
  ranking?: RaceRanking | null;
  /** "Otra vez": carrera nueva. */
  onRetry: () => void;
  /** "Salir": vuelve a Inicio. */
  onExit: () => void;
}

/** Textos del ranking en los resultados, ya formateados. */
export interface RankingTexts {
  /** Título de la tarjeta según la celebración ("¡Récord de la pista!", "Tu tiempo"). */
  title: string;
  /** Una por tabla en la que está el jugador: mejor vuelta y carrera completa. */
  tables: {
    key: 'lap' | 'race';
    /** "Mejor vuelta" o "Carrera · 3 vueltas". */
    label: string;
    /** "2.º de 4". */
    position: string;
    /** "¡Primero!" o "Te faltan 0.42 s para alcanzar a TOMI". */
    detail: string;
  }[];
}

/** Textos de la pantalla, ya formateados. */
export interface RaceResultsTexts {
  title: string;
  subtitle: string;
  best: string;
  total: string;
  /** Delta contra el récord anterior ("−0.578"); `null` si no había récord. */
  delta: string | null;
  /** Lo que acompaña al delta: "vs. récord anterior", "vs. tu récord" o "Primer récord". */
  deltaCaption: string;
  laps: { label: string; time: string; chip: string; best: boolean }[];
}
