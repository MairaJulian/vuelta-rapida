/** La ruta no le pasa props: decide con las preferencias guardadas y el interruptor. */
export interface StartScreenProps {
  /**
   * Si el jugador puede usar la inclinación. Por defecto, `FEATURE_FLAGS.tiltControl`;
   * los tests lo pasan para probar los dos estados.
   */
  tiltEnabled?: boolean;
}
