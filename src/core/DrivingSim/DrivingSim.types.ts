import type { CarState } from '@/core/DrivingModel';
import type { LapState } from '@/core/LapTimer';

/** Estado completo de la simulación. Serializable: solo números y objetos planos. */
export interface DrivingSimState {
  /** Estado tras el último paso fijo. */
  car: CarState;
  /** Estado del paso anterior; con `car` permite interpolar el render. */
  previousCar: CarState;
  /** Pasos fijos simulados desde el inicio. Con `stepHz` da el tiempo de simulación. */
  tick: number;
  /** Tiempo acumulado que todavía no completa un paso, en ms. */
  accumulatorMs: number;
  /**
   * Segmento del trazado más cercano al auto en el último paso; -1 antes del primero.
   * La búsqueda del paso siguiente empieza ahí.
   */
  trackSegment: number;
  /** Vueltas y tiempos, medidos en pasos de simulación. */
  laps: LapState;
}
