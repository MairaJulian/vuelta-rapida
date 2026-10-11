import type { CarState } from '@/core/DrivingModel';

/** Parámetros de los choques entre autos. Se ajustan en el panel de desarrollo. */
export interface CollisionConfig {
  /** Si los autos chocan entre sí. Apagado, se atraviesan. */
  enabled: boolean;
  /** Radio del círculo de cada auto, en metros. Dos autos chocan a menos del doble. */
  radius: number;
  /** Velocidad con que se separan tras un choque, en m/s: el empujón leve. */
  pushSpeed: number;
  /** Pérdida de velocidad del auto que choca por detrás, en 1/s mientras dura el contacto. */
  rearLossRate: number;
  /** Pérdida de velocidad del auto que recibe el choque, en 1/s mientras dura el contacto. */
  frontLossRate: number;
}

/** Resultado de resolver los choques de un paso. */
export interface CarCollisionResult {
  /** Los autos ya separados y empujados, en el mismo orden. Sin choques, los mismos objetos. */
  cars: CarState[];
  /**
   * Por auto, la velocidad con que se acercaba al otro al chocar, en m/s (0 si no
   * chocó). Un roce sin acercarse da 0 aunque `touching` sea verdadero.
   */
  impactSpeeds: number[];
  /** Por auto, si estaba solapado con otro en este paso. */
  touching: boolean[];
}
