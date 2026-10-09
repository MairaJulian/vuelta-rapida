export interface PauseMenuProps {
  /** Vuelta en curso y total, para "Vuelta 2 de 3". */
  lap: number;
  totalLaps: number;
  /** Nombre del circuito. */
  circuitName: string;
  /** Tiempo de la vuelta en curso, ya formateado ("1:04.318"). */
  lapTime: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  onExit: () => void;
}
