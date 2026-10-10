export interface UseSelectedTrackResult {
  /** Id de la pista elegida; siempre una pista que existe. */
  circuitId: string;
  /** Elige la pista (un id que no existe se cambia por la primera). */
  select: (circuitId: string) => void;
}
