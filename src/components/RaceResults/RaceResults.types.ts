import type { RaceResults } from '@/core/RaceFlow';

export interface RaceResultsProps {
  /** Resultado de la carrera, en pasos de simulación. */
  results: RaceResults;
  /** Pasos por segundo, para pasar los pasos a tiempo. */
  stepHz: number;
  /** Nombre del circuito. */
  circuitName: string;
  /** Quién corrió: encabeza la columna de vueltas ("MALE · #27"). Sin piloto, "Tus vueltas". */
  driver?: { name: string; number: number } | null;
  /** "Otra vez": carrera nueva. */
  onRetry: () => void;
  /** "Salir": vuelve a Inicio. */
  onExit: () => void;
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
