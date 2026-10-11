/** Quién es cada auto de la carrera: lo que se muestra en la tabla del HUD y en los resultados. */
export interface Racer {
  /** `PLAYER_ID` para el jugador; el id del rival para los demás. */
  id: string;
  /** Nombre en mayúsculas. */
  name: string;
  /** Color del auto, en hex. */
  color: string;
}

/** Un auto de la tabla de posiciones, ya listo para dibujar. */
export interface PositionRow {
  id: string;
  /** Puesto, desde 1. */
  place: number;
  /** Nombre en mayúsculas. */
  name: string;
  /** Color del auto, en hex. */
  color: string;
  /** El auto del jugador: la fila va resaltada. */
  player: boolean;
}

export interface PositionTableProps {
  /** Filas del primero al último. */
  rows: readonly PositionRow[];
}
