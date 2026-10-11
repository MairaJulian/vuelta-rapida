/**
 * Qué fantasma corre al lado del jugador (preferencia del celular):
 * - `mine`: la mejor vuelta del perfil activo en la pista.
 * - `record`: la mejor vuelta de la pista, de quien tenga el récord.
 * - `none`: sin fantasma.
 */
export type GhostSource = 'mine' | 'record' | 'none';

/**
 * Grabación de una vuelta tal como se guarda. Serializable y compacta:
 * - `d` es una lista plana de enteros, de a tres por muestra. La primera muestra es
 *   absoluta y las demás, la diferencia con la anterior: `[x, z, rumbo, dx, dz, drumbo, ...]`.
 *   Las posiciones van en centímetros y el rumbo en milésimas de radián, sin dar la
 *   vuelta (el rumbo es continuo: no salta de π a −π).
 * - Las muestras están separadas `1000 / hz` ms, salvo la última, que cae justo en la
 *   meta: su tiempo es `lapMs`.
 */
export interface GhostRecording {
  /** Versión del formato de la grabación (no la de los datos guardados). */
  v: 1;
  /** Muestras por segundo. */
  hz: number;
  /** Duración de la vuelta, en milisegundos: el tiempo de la última muestra. */
  lapMs: number;
  d: number[];
}

/** Grabación lista para reproducir: números sueltos, tiempos explícitos y progreso. */
export interface GhostPlayback {
  /** Duración de la vuelta, en milisegundos. */
  durationMs: number;
  /** Tiempo de cada muestra desde el inicio de la vuelta, en milisegundos. */
  timesMs: number[];
  x: number[];
  z: number[];
  /** Rumbo continuo (0 hacia -z, positivo en sentido horario), en radianes. */
  heading: number[];
  /**
   * Progreso de cada muestra sobre el trazado, en metros desde la meta, sin dar la
   * vuelta y sin retroceder. Una vuelta que parte antes de la meta empieza negativa.
   */
  progress: number[];
}

/** Dónde está el fantasma y hacia dónde mira. */
export interface GhostPose {
  x: number;
  z: number;
  heading: number;
}
