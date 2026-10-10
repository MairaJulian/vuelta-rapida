/** Caja de cambios del sonido del motor. Es solo sonido: la física no tiene marchas. */
export interface GearboxConfig {
  /**
   * Velocidad (de 0 a 1, relativa a la máxima del auto) a la que cada marcha llega al
   * corte: ahí se pasa a la siguiente. La última puede pasar de 1: a velocidad máxima,
   * el motor queda por debajo del corte.
   */
  gearTopSpeeds: readonly number[];
  /**
   * Revoluciones (de 0 a 1) por debajo de las que la marcha anterior quedaría al bajar:
   * se baja recién cuando la marcha de abajo tendría estas revoluciones o menos. Separa
   * los puntos de subida y de bajada para que no vaya y venga.
   */
  downshiftRpm: number;
}

/**
 * Ritmo de los cambios: cuándo llega a sexta acelerando desde 0, con la física por
 * defecto del auto. `quick` a los 2,5 s, `medium` a los 3 s y `slow` a los 3,5 s.
 */
export type GearboxPace = 'quick' | 'medium' | 'slow';

/** Hacia dónde cambió de marcha el último paso, o `null` si no cambió. */
export type GearShift = 'up' | 'down' | null;

export interface GearboxStep {
  /** Marcha, desde 0 (primera). */
  gear: number;
  /** Revoluciones del motor de 0 (detenido) a 1 (corte). */
  rpm: number;
  shift: GearShift;
}
