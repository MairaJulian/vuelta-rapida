/** Colores de auto que puede elegir el jugador. Se guardan por `id`, nunca como hex. */
export type CarColorId =
  'blue' | 'coral' | 'lime' | 'pink' | 'teal' | 'violet' | 'orange' | 'white';

export interface CarColor {
  id: CarColorId;
  /** Nombre para el jugador ("Azul"). */
  name: string;
  /** Color de la carrocería, en hex. */
  hex: string;
  /**
   * Color del número sobre este color (el círculo del número en las píldoras): blanco
   * sobre los oscuros y tinta sobre los claros, como pide el handoff.
   */
  numberColor: string;
}
