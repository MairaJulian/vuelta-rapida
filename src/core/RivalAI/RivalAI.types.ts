import type { CarState } from '@/core/DrivingModel';
import type { DrivingSimState } from '@/core/DrivingSim';
import type { CarColorId } from '@/core/CarPalette';
import type { RandomState } from '@/core/SeededRandom';

/** Niveles de dificultad de la IA, cada uno con su entrada en `AI_LEVELS`. */
export type AiLevelId = 'easy' | 'medium' | 'hard';

/** Parámetros de un nivel de dificultad. Se pueden afinar sin tocar el código de la IA. */
export interface AiLevel {
  id: AiLevelId;
  /** Distancia mínima del punto al que apunta el rival, en metros. */
  lookAheadMin: number;
  /** Segundos de camino que mira de más: la distancia crece con la velocidad. */
  lookAheadTime: number;
  /** Segundos de camino que mira en una curva: con el límite de velocidad del tramo da su distancia máxima, para no cortarla. */
  lookAheadCurveTime: number;
  /** Ritmo de cada rival, de `paceMin` a `paceMax`: fracción de la velocidad segura que usa (se sortea). */
  paceMin: number;
  paceMax: number;
  /** Aceleración lateral que acepta en una curva, en m/s². Con la curvatura da su velocidad máxima. */
  lateralAccel: number;
  /** Fracción del giro máximo de las ruedas que se permite usar en una curva, de 0 a 1. */
  steerReserve: number;
  /** Fracción del freno del auto que cuenta al planear la frenada: menos de 1 frena antes. */
  brakeDecelFactor: number;
  /** Freno por cada m/s por encima de la velocidad objetivo (1 = a fondo con 1 m/s de más). */
  brakeGain: number;
  /** Error de trazada: cuánto se aleja del centro de la pista, como mucho, en metros. */
  lineError: number;
  /**
   * Carril propio: cada rival sortea un carril de −1 a 1 y en recta se corre hacia él hasta
   * `laneSpread` veces el ancho libre (de 0 a 1), para no ir todos en fila por el centro.
   * En curva vuelve a la trazada.
   */
  laneSpread: number;
  /** Cada cuántos segundos cambia hacia dónde se desvía de la trazada. */
  lineChangeSeconds: number;
  /** Con qué rapidez se corre hacia la nueva trazada, en m/s. */
  lineRate: number;
  /**
   * Distancia al jugador, en metros, a la que el ajuste de ritmo llega a su máximo: el
   * rival que va detrás acelera y el que va delante se relaja, según cuánto los separa.
   */
  catchUpRange: number;
  /** Ritmo extra del rival que va detrás del jugador, como fracción (0,15 = +15 %). */
  catchUpBoost: number;
  /** Ritmo que pierde el rival que va delante del jugador, como fracción (0,12 = −12 %). */
  catchUpEase: number;
  /** Tope del ritmo con todos los ajustes, como fracción del límite seguro del tramo: deja margen en las curvas. */
  maxPace: number;
  /** Error de frenada: la velocidad objetivo se multiplica por 1 ± este valor (se sortea). */
  speedError: number;
}

/**
 * Lo que cambia mientras corre un rival: el azar de su imprecisión y la trazada
 * actual. Serializable.
 */
export interface RivalDriver {
  level: AiLevel;
  /** Ritmo de este rival (sorteado entre `paceMin` y `paceMax`). */
  pace: number;
  random: RandomState;
  /** Carril de este rival, de −1 (izquierda) a 1 (derecha); se sortea una vez con la semilla. */
  lane: number;
  /** Desvío actual de la trazada, en metros (positivo, a la derecha de la marcha). */
  lineOffset: number;
  /** Desvío al que se acerca. */
  lineTarget: number;
  /** Factor de la velocidad objetivo (error de frenada). */
  speedScale: number;
  /** Paso de simulación en que se sortean desvío y factor de nuevo. */
  nextDrawTick: number;
}

/** Un auto rival en la carrera. Serializable. */
export interface RivalState {
  id: string;
  driver: RivalDriver;
  /** El mismo modelo de manejo, pista y vueltas que el jugador. */
  sim: DrivingSimState;
  /** Paso del cronómetro de la llegada; `null` antes. */
  finishTick: number | null;
}

/** Datos para armar un rival en la grilla. */
export interface RivalSetup {
  id: string;
  /** Auto en su puesto de la grilla, detenido. */
  car: CarState;
  /** Progreso del puesto de la grilla, en metros desde la meta (cerca del largo de la vuelta). */
  startProgress: number;
  /** Corrimiento lateral del puesto de la grilla, en metros (positivo a la derecha); 0 por defecto. */
  startOffset?: number;
  seed: number;
  level: AiLevel;
}

/** Reglas que el rival necesita de la carrera. */
export interface RivalRules {
  totalLaps: number;
  /** Freno automático tras la llegada, de 0 a 1. */
  finishBrake: number;
}

/** Quién corre: nombre y color de un rival, inventados. */
export interface RivalIdentity {
  id: string;
  name: string;
  colorId: CarColorId;
}
