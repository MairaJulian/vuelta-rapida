/** Un problema del trazado. La validación devuelve todos los que encuentra. */
export type TrackIssue =
  /** Menos puntos de los necesarios para formar una vuelta. */
  | { kind: 'too-few-points'; count: number }
  /** Alguna coordenada o el ancho no es un número finito (o el ancho no es positivo). */
  | { kind: 'not-finite' }
  /** Dos puntos seguidos coinciden. */
  | { kind: 'repeated-point'; index: number }
  /** El tramo que vuelve al punto 0 es más largo que cualquier otro: la vuelta no está cerrada. */
  | { kind: 'not-closed'; gap: number }
  /** Dos segmentos no vecinos se cortan: el trazado se cruza consigo mismo. */
  | { kind: 'self-crossing'; segments: [number, number] }
  /** Dos tramos distintos del circuito quedan demasiado cerca: el asfalto se toca. */
  | { kind: 'sections-too-close'; points: [number, number]; distance: number }
  /** Una curva tan cerrada que el borde interior se pliega. */
  | { kind: 'curve-too-tight'; index: number; radius: number }
  /** Los puntos de control intermedios no están en orden dentro de la vuelta. */
  | { kind: 'checkpoints-out-of-order' };

/** Ajustes de la validación. Los valores por defecto son los de los circuitos del juego. */
export interface TrackValidationOptions {
  /** Separación mínima entre tramos distintos, en anchos de pista (de centro a centro). */
  minSeparationWidths: number;
  /** Dos puntos son de tramos distintos si están más lejos que esto sobre el trazado, en anchos. */
  distinctSectionWidths: number;
  /** Distancia sobre el trazado con que se mide el radio de cada curva, en metros. */
  radiusWindow: number;
}
