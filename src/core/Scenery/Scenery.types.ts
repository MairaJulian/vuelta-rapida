import type { Radians } from '@/core/MathUtils';
import type { TrackPoint } from '@/core/Track';
import type { RunoffConfig } from '@/core/TrackFeatures';

/**
 * Tipos de objeto de la escenografía:
 * - `treeLarge`, `treeSmall`, `bush`: árboles y arbustos fuera de la pista.
 * - `distanceBoard`: cartel de distancia (300, 200, 100) antes de una curva cerrada.
 * - `billboard`: cartel publicitario con una marca inventada.
 * - `grandstand`: tribuna de la recta principal.
 */
export type SceneryObjectKind =
  'treeLarge' | 'treeSmall' | 'bush' | 'distanceBoard' | 'billboard' | 'grandstand';

/**
 * Objeto de la escenografía, apoyado en el suelo. Ocupa un rectángulo de `length` ×
 * `depth` metros girado `rotation` (los árboles y arbustos, un círculo de diámetro
 * `length`). Serializable.
 */
export interface SceneryObject {
  kind: SceneryObjectKind;
  /** Centro en el suelo, en metros. */
  x: number;
  z: number;
  /**
   * Giro del eje largo (eje x local). En los carteles el texto queda derecho con la
   * cámara fija; en la tribuna, el eje y local apunta hacia afuera de la pista (el
   * frente, con el público, mira a la pista). Los árboles no giran.
   */
  rotation: Radians;
  /** Largo a lo largo del eje x local, en metros (diámetro en árboles y arbustos). */
  length: number;
  /** Profundidad a lo largo del eje y local, en metros. */
  depth: number;
  /**
   * Según el tipo: tono del follaje en árboles y arbustos (0 a 2), metros que faltan
   * para la curva en los carteles de distancia (300, 200 o 100) e índice de la marca
   * (`BILLBOARD_BRANDS`) en los carteles publicitarios. 0 en la tribuna.
   */
  variant: number;
}

/** Parche del asfalto: un polígono un poco más claro o más oscuro que la pista. */
export interface AsphaltPatch {
  tone: 'light' | 'dark';
  /** Vértices del polígono, en orden, en metros. */
  points: TrackPoint[];
}

/** Lo que identifica una escenografía: con los mismos datos, la misma escenografía. */
export interface ScenerySpec {
  /** Semilla del azar: la misma semilla da la misma escenografía. */
  seed: number;
  /** Multiplicador de la cantidad de árboles y arbustos: 0 ninguno, 1 lo normal, 2 el doble. */
  treeDensity: number;
}

/**
 * Escenografía de un circuito, como datos. La genera `generateScenery` a partir del
 * trazado; el render solo la dibuja. Serializable.
 */
export interface Scenery {
  spec: ScenerySpec;
  /** Árboles, arbustos, carteles y tribuna. */
  objects: SceneryObject[];
  /** Centros de los neumáticos de las barreras, en el exterior de las curvas. */
  tyres: TrackPoint[];
  /** Marcas de frenada sobre el asfalto: cada una es una línea abierta. */
  skidMarks: TrackPoint[][];
  /** Parches del asfalto, más claros o más oscuros. */
  patches: AsphaltPatch[];
  /**
   * Rumbo de las franjas de corte del pasto (0 hacia -z, positivo en sentido horario),
   * elegido para que ninguna recta larga corra paralela a ellas.
   */
  grassStripeAngle: Radians;
}

/** Medidas de los objetos con forma fija, en metros. */
export interface RectSize {
  length: number;
  depth: number;
}

/** Ajustes del generador. Los valores por defecto están en `DEFAULT_SCENERY_CONFIG`. */
export interface SceneryConfig {
  /** Escapatorias: pasto libre entre la pista y cualquier objeto. */
  runoff: RunoffConfig;
  /** Radio por debajo del cual una curva lleva carteles de distancia y marcas de frenada. */
  tightCornerRadius: number;
  /** Distancias de los carteles a la entrada de cada curva cerrada, en metros. */
  boardDistances: number[];
  /** Intentos de árboles por kilómetro de vuelta con densidad 1 (muchos se descartan). */
  treesPerKm: number;
  /** Intentos de arbustos por kilómetro de vuelta con densidad 1. */
  bushesPerKm: number;
  /** Ancho de la franja con árboles más allá de la escapatoria, en metros. */
  treeBand: number;
  /** Ancho de la franja con arbustos más allá de la escapatoria, en metros. */
  bushBand: number;
  /** Separación entre carteles publicitarios en la recta principal, en metros. */
  billboardSpacing: number;
  /** Separación entre carteles publicitarios en las otras rectas largas, en metros. */
  straightBillboardSpacing: number;
  /** Largo mínimo de una recta para llevar carteles publicitarios, en metros. */
  billboardMinStraight: number;
  /** Centro de la tribuna: metros antes de la meta. */
  grandstandBeforeFinish: number;
  /** Separación media entre parches del asfalto, en metros. */
  patchSpacing: number;
  /** Metros de frenada antes de cada curva cerrada con marcas en el asfalto. */
  skidZone: number;
}
