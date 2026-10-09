/** Estado del generador: un entero de 32 bits sin signo. Serializable. */
export type RandomState = number;

/** Un número al azar y el estado para pedir el siguiente. */
export interface RandomResult {
  /** En [0, 1). */
  value: number;
  /** Estado para la próxima llamada. */
  state: RandomState;
}
