/** Interruptores de configuración: partes del juego que existen pero se activan o no. */
export interface FeatureFlags {
  /**
   * Control por inclinación para el jugador. Desactivado, el juego arranca directo con
   * botones, sin elección de control ni calibración; la inclinación sigue disponible
   * desde el panel de desarrollo.
   */
  tiltControl: boolean;
}
