import type { FeatureFlags } from './FeatureFlags.types';

/**
 * Interruptores del juego. Se cambian aquí y valen para toda la app.
 *
 * `tiltControl` está desactivado: en dos pruebas con usuarios (la segunda con la
 * inclinación corregida) los testers prefirieron los botones. Se reevalúa en la
 * fase 3D, con la cámara detrás del auto.
 */
export const FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  tiltControl: false,
});
