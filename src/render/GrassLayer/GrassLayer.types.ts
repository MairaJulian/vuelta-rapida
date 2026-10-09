import type { Radians } from '@/core/MathUtils';

export interface GrassLayerProps {
  /**
   * Rumbo de las franjas (0 hacia -z, positivo en sentido horario). Sale de la
   * escenografía del circuito (`grassStripeAngle`).
   */
  angle: Radians;
  /** Contraste entre las dos franjas, de 0 (pasto liso) a 1 (franja oscura del handoff). */
  contrast: number;
}
