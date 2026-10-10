import type { ScenerySpec } from '@/core/Scenery';
import type { TrackPoint } from '@/core/Track';

/** Qué tan difícil es manejarlo: cuánto frena, cuánto gira y cuánto margen deja el asfalto. */
export type CircuitDifficulty = 'facil' | 'media' | 'dificil';

/**
 * Un circuito como datos: los puntos por donde pasa la pista, en el sentido de la
 * carrera. `buildCircuit` los suaviza con una curva y arma el trazado.
 */
export interface CircuitDefinition {
  /** Identificador estable: es la clave del récord guardado. No cambiarlo. */
  id: string;
  /** Nombre para mostrar. Inventado: nada de circuitos, marcas ni nombres reales. */
  name: string;
  /** Dificultad que muestra la selección de pista. */
  difficulty: CircuitDifficulty;
  /** Puntos de control en metros, en el sentido de la carrera. El primero es la meta. */
  controlPoints: TrackPoint[];
  /** Ancho del asfalto, en metros. */
  width: number;
  /** Puntos de control intermedios como fracción de la vuelta, en orden, entre 0 y 1. */
  checkpointFractions: number[];
  /** Semilla y densidad de la escenografía: con los mismos valores, los mismos árboles. */
  scenery: ScenerySpec;
}
