import type { DerivedValue } from 'react-native-reanimated';

import type { Racer } from '@/components/PositionTable';
import type { ClassificationEntry, RaceResults } from '@/core/RaceFlow';
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
  /**
   * Clasificación de todos los autos (de `useRaceLoop`). Con rivales se muestra, en vivo
   * hasta que llegan todos, encima de las vueltas; con un solo auto, o sin esta prop, no.
   */
  standings?: DerivedValue<ClassificationEntry[]>;
  /** Nombre y color de cada auto de la clasificación, el jugador incluido (con `PLAYER_ID`). Tiene que ser estable. */
  racers?: readonly Racer[];
  /** "Otra vez": carrera nueva. */
  onRetry: () => void;
  /** "Salir": vuelve a Inicio. */
  onExit: () => void;
}

/** Textos del ranking en los resultados, ya formateados. */
export interface RankingTexts {
  /** Título de la tarjeta según la celebración ("¡Récord de la pista!", "Tu tiempo"). */
  title: string;
  /** Una por tabla en la que está el jugador y hay más de un perfil: mejor vuelta y carrera completa. */
  tables: {
    key: 'lap' | 'race';
    /** "Ranking · mejor vuelta" o "Ranking · 3 vueltas". */
    label: string;
    /** "2.º de 4". */
    position: string;
    /** "¡Primero!" o "Te faltan 0.42 s para alcanzar a TOMI". */
    detail: string;
  }[];
}

/** Una fila de la clasificación, ya formateada. */
export interface ClassificationRowTexts {
  id: string;
  place: number;
  name: string;
  /** Color del auto, en hex. */
  color: string;
  /** El auto del jugador: la fila va resaltada. */
  player: boolean;
  /** Tiempo del líder, diferencia con el líder ("+0.345") o "Vuelta 2/3" si todavía corre. */
  detail: string;
  finished: boolean;
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
