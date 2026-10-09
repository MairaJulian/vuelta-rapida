import type { CarState, DrivingConfig } from '@/core/DrivingModel';

/** Parámetros del auto que usa el límite de pista. `DrivingConfig` los incluye. */
export type TrackBoundsConfig = Pick<DrivingConfig, 'collisionRadius' | 'wallFriction'>;

/** Cómo quedó el auto respecto de los bordes en un paso. Serializable. */
export interface TrackContact {
  /** Si en este paso tocó el límite (y se lo devolvió adentro). */
  touching: boolean;
  /** Velocidad hacia afuera que se anuló al tocar, en m/s; 0 si no tocó. Mide el golpe. */
  impactSpeed: number;
  /** Si la carrocería está sobre un piano. */
  onKerb: boolean;
}

/** Resultado de aplicar el límite: el auto ya corregido y el contacto. */
export interface TrackContactResult {
  car: CarState;
  contact: TrackContact;
}
