import { getDriftSpeed, getForwardSpeed, getSpeed } from '@/core/DrivingModel';
import { clamp } from '@/core/MathUtils';
import { createRandomState, nextRandom } from '@/core/SeededRandom';

import type {
  Particle,
  ParticleConfig,
  ParticleEmitter,
  ParticleKind,
  ParticleLook,
  ParticleState,
} from './Particles.types';

export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  maxParticles: 48,
  dustRate: 40,
  smokeRate: 30,
  dustMinSpeed: 3,
  driftThreshold: 2.5,
  driftFull: 7,
  brakeThreshold: 0.6,
  brakeMinSpeed: 15,
  dustLife: 0.7,
  smokeLife: 1.1,
  dustSize: 1.3,
  smokeSize: 1.1,
  dustGrowth: 2.4,
  smokeGrowth: 1.8,
  drag: 2.5,
  rearOffset: 1.7,
  wheelSpread: 0.75,
};

/** Opacidad al nacer de cada tipo. El polvo es más denso que el humo. */
const BASE_ALPHA: Record<ParticleKind, number> = { dust: 0.85, smoke: 0.7 };

/** Estado sin partículas. */
export function createParticleState(seed: number): ParticleState {
  'worklet';
  return {
    particles: [],
    random: createRandomState(seed),
    dustDebt: 0,
    smokeDebt: 0,
    nextWheel: 1,
  };
}

/**
 * Cuánto polvo y cuánto humo larga el auto, de 0 a 1. Polvo: rozando el borde, según
 * la velocidad. Humo: derrapando (según la velocidad lateral) o frenando fuerte a
 * velocidad; vale el mayor de los dos.
 */
export function getEmission(
  emitter: ParticleEmitter,
  config: ParticleConfig,
): { dust: number; smoke: number } {
  'worklet';
  if (!emitter.active) {
    return { dust: 0, smoke: 0 };
  }
  const speed = getSpeed(emitter.car);
  const dust = emitter.touching && speed >= config.dustMinSpeed ? clamp(speed / 25, 0.3, 1) : 0;
  const drift = Math.abs(getDriftSpeed(emitter.car));
  const span = config.driftFull - config.driftThreshold;
  const drifting =
    drift <= config.driftThreshold
      ? 0
      : span > 0
        ? clamp((drift - config.driftThreshold) / span, 0, 1)
        : 1;
  const braking =
    emitter.brake >= config.brakeThreshold && getForwardSpeed(emitter.car) >= config.brakeMinSpeed
      ? 0.6
      : 0;
  return { dust, smoke: Math.max(drifting, braking) };
}

/** Cómo se ve una partícula: crece con la edad y se desvanece hasta desaparecer. */
export function getParticleLook(particle: Particle): ParticleLook {
  'worklet';
  const t = particle.life > 0 ? clamp(particle.age / particle.life, 0, 1) : 1;
  return {
    size: particle.size + particle.growth * particle.age,
    alpha: BASE_ALPHA[particle.kind] * (1 - t) * (1 - t),
  };
}

/**
 * Avanza las partículas `dt` segundos y suma las que larga el auto. Las nuevas salen
 * de las ruedas traseras, una de cada lado por turno, con un poco de la velocidad del
 * auto y un empujón al azar. Pura y determinista: el azar va en el estado. Si no hay
 * nada que mover ni que emitir, devuelve el mismo estado. Sin `settings`, usa
 * `DEFAULT_PARTICLE_CONFIG`.
 */
export function stepParticles(
  state: ParticleState,
  emitter: ParticleEmitter,
  dt: number,
  settings?: ParticleConfig,
): ParticleState {
  'worklet';
  // El valor por defecto se resuelve en el cuerpo: el plugin de worklets no lleva al
  // hilo de UI las constantes usadas como valor por defecto de un parámetro.
  const config = settings ?? DEFAULT_PARTICLE_CONFIG;
  const emission = getEmission(emitter, config);
  if (state.particles.length === 0 && emission.dust === 0 && emission.smoke === 0) {
    return state.dustDebt === 0 && state.smokeDebt === 0
      ? state
      : { ...state, dustDebt: 0, smokeDebt: 0 };
  }
  const step = Math.max(dt, 0);
  const keep = Math.exp(-Math.max(config.drag, 0) * step);
  const particles: Particle[] = [];
  for (let i = 0; i < state.particles.length; i += 1) {
    const particle = state.particles[i];
    const age = particle.age + step;
    if (age < particle.life) {
      particles.push({
        ...particle,
        x: particle.x + particle.vx * step,
        z: particle.z + particle.vz * step,
        vx: particle.vx * keep,
        vz: particle.vz * keep,
        age,
      });
    }
  }

  let random = state.random;
  const roll = () => {
    const result = nextRandom(random);
    random = result.state;
    return result.value;
  };
  let wheel = state.nextWheel;
  const { car } = emitter;
  const forwardX = Math.sin(car.heading);
  const forwardZ = -Math.cos(car.heading);
  const rightX = Math.cos(car.heading);
  const rightZ = Math.sin(car.heading);
  const spawn = (kind: ParticleKind) => {
    const side = wheel;
    wheel = wheel === 1 ? -1 : 1;
    const x = car.x - forwardX * config.rearOffset + rightX * side * config.wheelSpread;
    const z = car.z - forwardZ * config.rearOffset + rightZ * side * config.wheelSpread;
    // El polvo sale despedido hacia su costado; el humo apenas se mueve y se queda atrás.
    const push = kind === 'dust' ? 1.5 + roll() * 2 : (roll() - 0.5) * 1.6;
    const drift = (roll() - 0.5) * (kind === 'dust' ? 1.2 : 0.8);
    const carry = kind === 'dust' ? 0.25 : 0.1;
    particles.push({
      kind,
      x,
      z,
      vx: car.vx * carry + rightX * side * push + forwardX * drift,
      vz: car.vz * carry + rightZ * side * push + forwardZ * drift,
      age: 0,
      life: (kind === 'dust' ? config.dustLife : config.smokeLife) * (0.8 + roll() * 0.4),
      size: (kind === 'dust' ? config.dustSize : config.smokeSize) * (0.8 + roll() * 0.4),
      growth: kind === 'dust' ? config.dustGrowth : config.smokeGrowth,
    });
  };

  // Lo que no entra en el máximo se descarta: la deuda no se acumula.
  let dustDebt = state.dustDebt + config.dustRate * emission.dust * step;
  let smokeDebt = state.smokeDebt + config.smokeRate * emission.smoke * step;
  while (dustDebt >= 1 || smokeDebt >= 1) {
    if (particles.length >= config.maxParticles) {
      dustDebt = Math.min(dustDebt, 1);
      smokeDebt = Math.min(smokeDebt, 1);
      break;
    }
    if (dustDebt >= smokeDebt) {
      spawn('dust');
      dustDebt -= 1;
    } else {
      spawn('smoke');
      smokeDebt -= 1;
    }
  }
  if (emission.dust === 0) {
    dustDebt = 0;
  }
  if (emission.smoke === 0) {
    smokeDebt = 0;
  }

  return { particles, random, dustDebt, smokeDebt, nextWheel: wheel };
}
