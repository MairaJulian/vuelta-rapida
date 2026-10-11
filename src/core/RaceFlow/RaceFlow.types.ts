import type { CarState } from '@/core/DrivingModel';
import type { DrivingSimState } from '@/core/DrivingSim';
import type { CelebrationKind } from '@/core/Ranking';
import type { RandomState } from '@/core/SeededRandom';

/**
 * Estados de la carrera:
 * - `grid`: en la grilla, quieto, esperando el semáforo.
 * - `lights`: se encienden las luces; el auto sigue quieto.
 * - `racing`: desde que se apagan las luces hasta completar la última vuelta.
 * - `finished`: carrera terminada; el auto frena solo.
 * - `paused`: todo congelado; vuelve al estado en que estaba.
 */
export type RacePhase = 'grid' | 'lights' | 'racing' | 'finished' | 'paused';

/** Estados que se pueden pausar. */
export type PausablePhase = 'grid' | 'lights' | 'racing';

/** Reglas de la carrera. Los tiempos van en segundos; se pasan a pasos con `stepHz`. */
export interface RaceConfig {
  /** Vueltas de la carrera. */
  totalLaps: number;
  /** Luces del semáforo. */
  lightCount: number;
  /** Tiempo entre una luz y la siguiente; la primera se enciende a este tiempo del comienzo. */
  lightInterval: number;
  /** Espera al azar con todas encendidas antes de apagarlas: mínimo y máximo. */
  lightsOutDelayMin: number;
  lightsOutDelayMax: number;
  /** Tiempo mínimo entre dos toques de borde avisados. */
  borderHitInterval: number;
  /** Tiempo mínimo entre dos entradas a un piano avisadas. */
  kerbInterval: number;
  /** Freno automático tras la llegada, de 0 a 1. */
  finishBrake: number;
}

/** Datos para armar una carrera. */
export interface RaceSetup {
  /** Auto en la grilla, detenido. */
  car: CarState;
  /** Semilla del azar de la carrera (la espera del semáforo). */
  seed: number;
  /** Récord del circuito al empezar, en pasos; `null` si no hay. */
  recordTicks: number | null;
  /** Pasos de simulación por segundo. */
  stepHz: number;
  config: RaceConfig;
}

/**
 * Lo que pasa en la carrera. `tick` es el paso de la carrera en que pasó (cuenta
 * todos los pasos menos los de la pausa). Serializable.
 *
 * `recordTrace` acompaña a `newRecord`: trae las muestras de esa vuelta (la que mejora el
 * récord) para guardarla como fantasma. `sampleHz` son las muestras por segundo.
 *
 * `celebration` es la excepción: no sale de la simulación sino de la pantalla, cuando
 * aparecen los resultados y el ranking dice que hubo algo que festejar (hito 6b). Por
 * eso no tiene `tick`. El sonido y la vibración lo escuchan como a los demás.
 */
export type RaceEvent =
  | { type: 'phase'; tick: number; from: RacePhase; to: RacePhase }
  | { type: 'lightOn'; tick: number; light: number }
  | { type: 'lightsOut'; tick: number }
  | { type: 'lapCompleted'; tick: number; lap: number; totalLaps: number; lapTicks: number }
  | { type: 'borderHit'; tick: number; impactSpeed: number }
  | { type: 'kerbEnter'; tick: number; speed: number }
  | { type: 'newRecord'; tick: number; lapTicks: number; previousTicks: number | null }
  | { type: 'recordTrace'; tick: number; lapTicks: number; sampleHz: number; samples: number[] }
  | ({ type: 'finish'; tick: number } & RaceResults)
  | { type: 'celebration'; kind: CelebrationKind };

/** Tipos de evento de la carrera. */
export type RaceEventType = RaceEvent['type'];

/**
 * Estado completo de la carrera. Serializable: con la semilla y la entrada de cada
 * cuadro se reproduce entera. El cronómetro es `sim.tick`: la simulación del auto
 * solo avanza desde que se apagan las luces.
 */
export interface RaceState {
  phase: RacePhase;
  /** Estado al que vuelve la pausa; `null` si no está en pausa. */
  pausedPhase: PausablePhase | null;
  /** Pasos de la carrera, sin contar la pausa. */
  tick: number;
  /** Paso en que empezó el estado actual. */
  phaseTick: number;
  /** Luces encendidas, de 0 a `config.lightCount`. */
  lightsOn: number;
  /** Espera al azar antes de apagar las luces, en segundos (sale de la semilla). */
  lightsOutDelay: number;
  /** Estado del azar tras sortear la espera. */
  random: RandomState;
  seed: number;
  stepHz: number;
  config: RaceConfig;
  /** El auto, sus vueltas según las puertas del circuito y el cronómetro (`sim.tick`). */
  sim: DrivingSimState;
  /**
   * Paso del cronómetro en que terminó cada vuelta de la carrera. La vuelta 1 se
   * cuenta desde que se apagan las luces (paso 0), como en una largada real.
   */
  lapEndTicks: number[];
  /** Paso del cronómetro de la llegada; `null` antes. */
  finishTick: number | null;
  /** Récord al empezar la carrera, en pasos; `null` si no había. */
  previousRecordTicks: number | null;
  /** Récord vigente: el de antes o el que se hizo en esta carrera. */
  recordTicks: number | null;
  /** Si en esta carrera se hizo un récord. */
  newRecord: boolean;
  /** Paso del cronómetro del último toque de borde avisado. */
  lastBorderHitTick: number | null;
  /** Paso del cronómetro de la última entrada a un piano avisada. */
  lastKerbTick: number | null;
  /**
   * Grabación de la vuelta en curso para el fantasma: lista plana `[x, z, rumbo, ...]`,
   * una muestra cada `getGhostSampleGap(stepHz)` pasos desde el inicio de la vuelta.
   * Vacía antes de largar y tras la llegada.
   */
  lapTrace: number[];
  /** Eventos todavía no entregados, en orden. `takeRaceEvents` los retira. */
  events: RaceEvent[];
}

/** Lo que muestra el HUD de la vuelta. */
export interface RaceLapView {
  /** Vuelta en curso, de 1 a `totalLaps`. */
  lap: number;
  totalLaps: number;
  /** Tiempo de la vuelta en curso, en pasos (0 antes de largar). */
  lapTicks: number;
}

/** Resultado de una carrera terminada. */
export interface RaceResults {
  /** Desde la largada hasta la llegada, en pasos: la suma de las vueltas. */
  totalTicks: number;
  /** Duración de cada vuelta, en pasos. */
  lapTicks: number[];
  bestLapTicks: number;
  /** Índice de la mejor vuelta (la primera, si hay empate). */
  bestLapIndex: number;
  newRecord: boolean;
  /** Récord al empezar la carrera; `null` si no había. */
  previousRecordTicks: number | null;
}
