import type { SharedValue } from 'react-native-reanimated';

import type { CarState, DrivingInput } from '@/core/DrivingModel';
import type { ParticleConfig, ParticleState } from '@/core/Particles';
import type { RaceState } from '@/core/RaceFlow';

export interface UseParticlesParams {
  /** La carrera (de `useRaceLoop`): fase y contacto con el borde. */
  race: SharedValue<RaceState>;
  /** El auto a dibujar en este cuadro (de `useRaceLoop`). */
  car: SharedValue<CarState>;
  /** La entrada del jugador: el freno. */
  input: SharedValue<DrivingInput>;
  /** Si hay partículas. Apagarlas borra las que había. */
  enabled: boolean;
  /** Ajustes; por defecto `DEFAULT_PARTICLE_CONFIG`. */
  config?: ParticleConfig;
  /** Semilla del azar de las partículas. Por defecto, fija. */
  seed?: number;
}

/** Partículas vivas, actualizadas en el hilo de UI cada cuadro. */
export type UseParticlesResult = SharedValue<ParticleState>;
