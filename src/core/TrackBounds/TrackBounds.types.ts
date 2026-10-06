import type { DrivingConfig } from '@/core/DrivingModel';

/** Parámetros del auto que usa el límite de pista. `DrivingConfig` los incluye. */
export type TrackBoundsConfig = Pick<DrivingConfig, 'collisionRadius' | 'wallFriction'>;
