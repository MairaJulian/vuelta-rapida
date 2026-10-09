import type { CarState } from '@/core/DrivingModel';
import type { RandomState } from '@/core/SeededRandom';

/**
 * Tipos de partícula:
 * - `dust`: polvo al rozar el borde de la pista (las ruedas tocan el pasto).
 * - `smoke`: humo de las gomas al derrapar o al frenar fuerte.
 */
export type ParticleKind = 'dust' | 'smoke';

/** Una partícula en el mundo. Serializable. */
export interface Particle {
  kind: ParticleKind;
  /** Posición, en metros. */
  x: number;
  z: number;
  /** Velocidad, en m/s. */
  vx: number;
  vz: number;
  /** Segundos de vida que lleva y que tiene en total. */
  age: number;
  life: number;
  /** Diámetro al nacer, en metros; crece con `growth` m/s. */
  size: number;
  growth: number;
}

/** Estado de todas las partículas. Serializable. */
export interface ParticleState {
  /** Partículas vivas, de la más vieja a la más nueva. */
  particles: Particle[];
  /** Estado del azar de la emisión. */
  random: RandomState;
  /** Partículas que quedaron por emitir (fracción) de cada tipo. */
  dustDebt: number;
  smokeDebt: number;
  /** Rueda trasera de la que sale la próxima partícula: 1 derecha, -1 izquierda. */
  nextWheel: 1 | -1;
}

/** Lo que pasa con el auto en este cuadro. */
export interface ParticleEmitter {
  car: CarState;
  /** Si el auto toca el borde de la pista. */
  touching: boolean;
  /** Freno, de 0 a 1. */
  brake: number;
  /** Si el auto está corriendo (no emite en la grilla ni con el semáforo). */
  active: boolean;
}

/** Ajustes de las partículas. */
export interface ParticleConfig {
  /** Partículas vivas como máximo: la capa reserva ese lugar. */
  maxParticles: number;
  /** Partículas por segundo a pleno. */
  dustRate: number;
  smokeRate: number;
  /** Velocidad mínima para levantar polvo, en m/s. */
  dustMinSpeed: number;
  /** Derrape (velocidad lateral, m/s) desde el que sale humo y con el que sale a pleno. */
  driftThreshold: number;
  driftFull: number;
  /** Freno desde el que sale humo, de 0 a 1, y velocidad mínima hacia adelante, en m/s. */
  brakeThreshold: number;
  brakeMinSpeed: number;
  /** Vida en segundos. */
  dustLife: number;
  smokeLife: number;
  /** Diámetro al nacer, en metros, y cuánto crece por segundo. */
  dustSize: number;
  smokeSize: number;
  dustGrowth: number;
  smokeGrowth: number;
  /** Frenado de las partículas en el aire, en 1/s. */
  drag: number;
  /** Distancia del centro del auto a las ruedas traseras, hacia atrás y a cada lado, en metros. */
  rearOffset: number;
  wheelSpread: number;
}

/** Cómo se ve una partícula en este momento. */
export interface ParticleLook {
  /** Diámetro, en metros. */
  size: number;
  /** Opacidad, de 0 a 1. */
  alpha: number;
}
