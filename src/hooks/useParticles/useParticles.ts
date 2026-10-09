import { useEffect } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { createParticleState, DEFAULT_PARTICLE_CONFIG, stepParticles } from '@/core/Particles';
import type { ParticleState } from '@/core/Particles';

import type { UseParticlesParams, UseParticlesResult } from './useParticles.types';

/** Paso máximo de un cuadro, en segundos: tras un tirón, las partículas no saltan. */
const MAX_FRAME_SECONDS = 0.05;

/**
 * Mueve las partículas de polvo y humo en el hilo de UI, un cuadro a la vez, con la
 * carrera y el auto de `useRaceLoop`. En pausa se congelan. Si no hay nada que mover ni
 * que emitir, no toca el valor compartido: la capa que las dibuja no trabaja.
 */
export function useParticles({
  race,
  car,
  input,
  enabled,
  config = DEFAULT_PARTICLE_CONFIG,
  seed = 1,
}: UseParticlesParams): UseParticlesResult {
  const particles = useSharedValue<ParticleState>(createParticleState(seed));
  const enabledValue = useSharedValue(enabled);
  const configValue = useSharedValue(config);

  useEffect(() => enabledValue.set(enabled), [enabled, enabledValue]);
  useEffect(() => configValue.set(config), [config, configValue]);

  useFrameCallback((frame) => {
    'worklet';
    const current = particles.get();
    if (!enabledValue.get()) {
      if (current.particles.length > 0) {
        particles.set({ ...current, particles: [], dustDebt: 0, smokeDebt: 0 });
      }
      return;
    }
    const state = race.get();
    if (state.phase === 'paused') {
      return;
    }
    const dt = Math.min((frame.timeSincePreviousFrame ?? 0) / 1000, MAX_FRAME_SECONDS);
    const next = stepParticles(
      current,
      {
        car: car.get(),
        touching: state.sim.contact.touching,
        brake: input.get().brake,
        active: state.phase === 'racing' || state.phase === 'finished',
      },
      dt,
      configValue.get(),
    );
    if (next !== current) {
      particles.set(next);
    }
  });

  return particles;
}
