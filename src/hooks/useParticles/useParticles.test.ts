import { renderHook } from '@testing-library/react-native';
import { useFrameCallback } from 'react-native-reanimated';

import { createCarState } from '@/core/DrivingModel';
import { DEFAULT_PARTICLE_CONFIG } from '@/core/Particles';

import { useParticles } from './useParticles';

/** Valor compartido simple que el test puede cambiar entre cuadros. */
function shared<Value>(initial: Value) {
  const value = { current: initial };
  return {
    get: () => value.current,
    set: (next: Value) => (value.current = next),
    get value() {
      return value.current;
    },
  };
}

/** Lo mínimo de la carrera que leen las partículas. */
const raceIn = (phase: string, touching: boolean) =>
  ({ phase, sim: { contact: { touching, impactSpeed: 0, onKerb: false } } }) as never;

async function renderParticles(enabled = true) {
  const race = shared(raceIn('racing', true));
  const car = shared({ ...createCarState(0, 0, Math.PI / 2), vx: 30 });
  const input = shared({ steer: 0, brake: 0 });
  const hook = await renderHook(
    (props: { enabled: boolean }) =>
      useParticles({
        race: race as never,
        car: car as never,
        input: input as never,
        enabled: props.enabled,
      }),
    { initialProps: { enabled } },
  );
  const frames = (count: number) => {
    const callback = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
    for (let i = 0; i < count; i += 1) {
      callback({ timestamp: 16 * i, timeSincePreviousFrame: 1000 / 60, timeSinceFirstFrame: 0 });
    }
  };
  return { ...hook, race, frames };
}

describe('useParticles', () => {
  it('rozando el borde en carrera larga polvo', async () => {
    const { result, frames } = await renderParticles();
    frames(30);
    const particles = result.current.value.particles;
    expect(particles.length).toBeGreaterThan(10);
    expect(particles.every((particle) => particle.kind === 'dust')).toBe(true);
  });

  it('en pausa se congelan', async () => {
    const { result, race, frames } = await renderParticles();
    frames(10);
    const before = result.current.value;
    race.set(raceIn('paused', true));
    frames(10);
    expect(result.current.value).toBe(before);
  });

  it('en la grilla no larga nada y no toca el valor', async () => {
    const { result, race, frames } = await renderParticles();
    race.set(raceIn('grid', true));
    const before = result.current.value;
    frames(10);
    expect(result.current.value).toBe(before);
    expect(before.particles).toEqual([]);
  });

  it('apagadas, borra las que había y no larga más', async () => {
    const { result, frames, rerender } = await renderParticles();
    frames(10);
    expect(result.current.value.particles.length).toBeGreaterThan(0);
    await rerender({ enabled: false });
    frames(10);
    expect(result.current.value.particles).toEqual([]);
  });

  it('nunca pasan del máximo', async () => {
    const { result, frames } = await renderParticles();
    frames(240);
    expect(result.current.value.particles.length).toBeLessThanOrEqual(
      DEFAULT_PARTICLE_CONFIG.maxParticles,
    );
  });
});
