import { createCarState } from '@/core/DrivingModel';
import type { CarState } from '@/core/DrivingModel';

import {
  createParticleState,
  DEFAULT_PARTICLE_CONFIG,
  getEmission,
  getParticleLook,
  stepParticles,
} from './Particles';
import type { ParticleEmitter, ParticleState } from './Particles.types';

/** Auto mirando hacia +x (rumbo π/2) a `speed` m/s, con `drift` m/s de derrape hacia su derecha (+z). */
function car(speed: number, drift = 0): CarState {
  return { ...createCarState(0, 0, Math.PI / 2), vx: speed, vz: drift };
}

const emitter = (overrides: Partial<ParticleEmitter> = {}): ParticleEmitter => ({
  car: car(30),
  touching: false,
  brake: 0,
  active: true,
  ...overrides,
});

/** Avanza `seconds` en pasos de 1/60 s. */
function run(state: ParticleState, source: ParticleEmitter, seconds: number) {
  let current = state;
  for (let i = 0; i < Math.round(seconds * 60); i += 1) {
    current = stepParticles(current, source, 1 / 60);
  }
  return current;
}

describe('getEmission', () => {
  it('sin correr no larga nada', () => {
    expect(
      getEmission(emitter({ active: false, touching: true }), DEFAULT_PARTICLE_CONFIG),
    ).toEqual({
      dust: 0,
      smoke: 0,
    });
  });

  it('polvo solo rozando el borde y en movimiento', () => {
    expect(getEmission(emitter({ touching: true }), DEFAULT_PARTICLE_CONFIG).dust).toBeGreaterThan(
      0,
    );
    expect(getEmission(emitter(), DEFAULT_PARTICLE_CONFIG).dust).toBe(0);
    expect(
      getEmission(emitter({ touching: true, car: car(1) }), DEFAULT_PARTICLE_CONFIG).dust,
    ).toBe(0);
  });

  it('humo al derrapar, más cuanto más derrapa', () => {
    const config = DEFAULT_PARTICLE_CONFIG;
    expect(getEmission(emitter({ car: car(30, 1) }), config).smoke).toBe(0);
    const some = getEmission(emitter({ car: car(30, 4) }), config).smoke;
    const full = getEmission(emitter({ car: car(30, 10) }), config).smoke;
    expect(some).toBeGreaterThan(0);
    expect(full).toBe(1);
    expect(some).toBeLessThan(full);
  });

  it('humo al frenar fuerte a velocidad, no al frenar despacio', () => {
    const config = DEFAULT_PARTICLE_CONFIG;
    expect(getEmission(emitter({ brake: 1 }), config).smoke).toBeGreaterThan(0);
    expect(getEmission(emitter({ brake: 0.3 }), config).smoke).toBe(0);
    expect(getEmission(emitter({ brake: 1, car: car(5) }), config).smoke).toBe(0);
  });
});

describe('stepParticles', () => {
  it('sin nada que hacer devuelve el mismo estado', () => {
    const state = createParticleState(1);
    expect(stepParticles(state, emitter(), 1 / 60)).toBe(state);
  });

  it('rozando el borde larga polvo detrás del auto, a la velocidad pedida', () => {
    const state = run(createParticleState(1), emitter({ touching: true }), 0.5);
    const dust = state.particles.filter((particle) => particle.kind === 'dust');
    // 30 m/s: intensidad 1,2 → tope 1; 40 por segundo durante medio segundo.
    expect(dust.length).toBeGreaterThanOrEqual(18);
    expect(dust.length).toBeLessThanOrEqual(21);
    // El auto está en el origen mirando hacia +x: las ruedas traseras quedan en x < 0.
    const newest = dust[dust.length - 1];
    expect(newest.x).toBeLessThan(0);
  });

  it('salen de las dos ruedas traseras, por turno', () => {
    const state = run(createParticleState(1), emitter({ touching: true }), 0.1);
    const sides = state.particles.slice(0, 2).map((particle) => Math.sign(particle.z));
    expect(sides).toEqual([1, -1]);
  });

  it('nunca pasan del máximo', () => {
    const config = { ...DEFAULT_PARTICLE_CONFIG, maxParticles: 10 };
    let state = createParticleState(1);
    for (let i = 0; i < 120; i += 1) {
      state = stepParticles(state, emitter({ touching: true, car: car(30, 10) }), 1 / 60, config);
      expect(state.particles.length).toBeLessThanOrEqual(10);
    }
  });

  it('se mueven, se frenan y desaparecen al terminar su vida', () => {
    const born = run(createParticleState(1), emitter({ touching: true }), 0.1);
    const first = born.particles[0];
    const later = stepParticles(born, emitter({ active: false }), 0.1);
    const moved = later.particles[0];
    expect(moved.age).toBeCloseTo(first.age + 0.1, 9);
    expect(Math.hypot(moved.vx, moved.vz)).toBeLessThan(Math.hypot(first.vx, first.vz));
    const gone = run(later, emitter({ active: false }), 2);
    expect(gone.particles).toEqual([]);
  });

  it('es determinista: la misma semilla da las mismas partículas', () => {
    const source = emitter({ touching: true, car: car(30, 6) });
    expect(run(createParticleState(5), source, 0.5)).toEqual(
      run(createParticleState(5), source, 0.5),
    );
    expect(run(createParticleState(6), source, 0.5)).not.toEqual(
      run(createParticleState(5), source, 0.5),
    );
  });

  it('al dejar de emitir se pierde lo que quedaba por emitir', () => {
    const emitting = stepParticles(createParticleState(1), emitter({ touching: true }), 0.01);
    expect(emitting.dustDebt).toBeGreaterThan(0);
    const stopped = stepParticles(emitting, emitter(), 0.01);
    expect(stopped.dustDebt).toBe(0);
  });
});

describe('getParticleLook', () => {
  it('crece con la edad y se desvanece hasta 0 al final de su vida', () => {
    const particle = {
      kind: 'smoke' as const,
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      age: 0,
      life: 1,
      size: 1,
      growth: 2,
    };
    const young = getParticleLook(particle);
    const old = getParticleLook({ ...particle, age: 0.5 });
    const dead = getParticleLook({ ...particle, age: 1 });
    expect(young.alpha).toBeGreaterThan(old.alpha);
    expect(old.size).toBeCloseTo(2, 9);
    expect(dead.alpha).toBe(0);
  });
});
