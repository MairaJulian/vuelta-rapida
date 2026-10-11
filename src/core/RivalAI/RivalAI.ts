import { getCarColor } from '@/core/CarPalette';
import type { CarColorId } from '@/core/CarPalette';
import { getForwardSpeed, getMaxSteerAngle } from '@/core/DrivingModel';
import type { DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import { createDrivingSim, stepDrivingSim } from '@/core/DrivingSim';
import { clamp, wrapAngle } from '@/core/MathUtils';
import { getRaceDistance } from '@/core/RacePositions';
import { createRandomState, nextRandomBetween } from '@/core/SeededRandom';
import { getCurvatureProfile, getPoseAtProgress, getSegmentAtProgress } from '@/core/Track';
import type { Circuit } from '@/core/Track';
import { getTrackLimit } from '@/core/TrackBounds';

import type {
  AiLevel,
  AiLevelId,
  RivalDriver,
  RivalIdentity,
  RivalRules,
  RivalSetup,
  RivalState,
} from './RivalAI.types';

/** Rivales por carrera. */
export const RIVAL_COUNT = 3;

/**
 * Niveles de dificultad. Hoy solo existe el fácil (rivales a un 88–95 % de lo que
 * aguantan las curvas, con trazada y frenada imprecisas); medio y difícil se suman acá.
 */
export const AI_LEVELS: Readonly<Record<AiLevelId, AiLevel>> = Object.freeze({
  easy: Object.freeze({
    id: 'easy',
    lookAheadMin: 9,
    lookAheadTime: 0.35,
    lookAheadCurveTime: 0.45,
    paceMin: 0.88,
    paceMax: 0.95,
    lateralAccel: 30,
    steerReserve: 0.65,
    brakeDecelFactor: 0.6,
    brakeGain: 0.3,
    lineError: 1,
    lineChangeSeconds: 1.5,
    lineRate: 0.8,
    catchUpRange: 150,
    catchUpBoost: 0.15,
    catchUpEase: 0.12,
    maxPace: 0.97,
    speedError: 0.06,
  }),
});

export const DEFAULT_AI_LEVEL_ID: AiLevelId = 'easy';

/** Nombres inventados de los rivales, en orden. */
export const RIVAL_NAMES: readonly string[] = Object.freeze([
  'Chispa',
  'Ráfaga',
  'Cometa',
  'Trueno',
  'Bólido',
  'Meteoro',
]);

/**
 * Colores de los rivales, en orden de preferencia. Lima y blanco van al final: sobre
 * el pasto y el asfalto claro se leen peor.
 */
const RIVAL_COLOR_ORDER: readonly CarColorId[] = Object.freeze([
  'coral',
  'violet',
  'orange',
  'teal',
  'pink',
  'blue',
  'white',
  'lime',
]);

/** Velocidad mínima que la IA pide en una curva, en m/s: nunca se clava. */
const MIN_CORNER_SPEED = 7;
/** Distancia mínima a la que mira la IA en una curva cerrada, en metros. */
const MIN_LOOK_AHEAD = 5;
/** Pasos de la búsqueda binaria de la velocidad que permite el giro de las ruedas. */
const STEER_SEARCH_STEPS = 14;

/**
 * Los rivales de la carrera: `count` autos con nombre y color inventados, siempre
 * distintos al del jugador (`playerColorId`) y entre sí.
 */
export function createRivalRoster(
  playerColorId: string,
  count: number = RIVAL_COUNT,
): RivalIdentity[] {
  const own = getCarColor(playerColorId).id;
  const colors = RIVAL_COLOR_ORDER.filter((id) => id !== own);
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({
    id: `rival-${i + 1}`,
    name: RIVAL_NAMES[i % RIVAL_NAMES.length],
    colorId: colors[i % colors.length],
  }));
}

/**
 * Velocidad más alta que el giro de las ruedas permite en una curva de curvatura
 * `curvature` (1/m), usando solo `reserve` del giro máximo. El giro disminuye con la
 * velocidad (`getMaxSteerAngle`), así que se busca el punto de cruce.
 */
function steeringSpeedLimit(curvature: number, config: DrivingConfig, reserve: number): number {
  const capacity = (speed: number) =>
    (Math.tan(getMaxSteerAngle(speed, config)) / config.wheelbase) * reserve;
  if (capacity(config.maxSpeed) >= curvature) {
    return config.maxSpeed;
  }
  if (capacity(0) < curvature) {
    return 0;
  }
  let low = 0;
  let high = config.maxSpeed;
  for (let i = 0; i < STEER_SEARCH_STEPS; i += 1) {
    const middle = (low + high) / 2;
    if (capacity(middle) >= curvature) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
}

/**
 * Velocidad objetivo para cada punto del trazado, en m/s, con la configuración de
 * manejo de ese momento. Sale de la curvatura: en cada punto, lo que permiten la
 * aceleración lateral del nivel y el giro de las ruedas. Después se recorre la vuelta
 * hacia atrás para que la frenada empiece antes de las curvas cerradas (con el freno
 * que el nivel dice usar). No incluye el ritmo del rival. Se calcula una vez por
 * carrera, en el hilo de JS.
 */
export function buildSpeedProfile(
  circuit: Circuit,
  config: DrivingConfig,
  level: AiLevel,
): number[] {
  const { distances, length } = circuit;
  const count = distances.length;
  const speeds = getCurvatureProfile(circuit).map((curvature) => {
    if (curvature <= 1e-6) {
      return config.maxSpeed;
    }
    const byGrip = Math.sqrt(level.lateralAccel / curvature);
    const bySteering = steeringSpeedLimit(curvature, config, level.steerReserve);
    return clamp(Math.min(byGrip, bySteering), MIN_CORNER_SPEED, config.maxSpeed);
  });
  const brake = Math.max(config.brakeDeceleration * level.brakeDecelFactor, 1);
  // Dos pasadas hacia atrás: la segunda cierra el empalme de la meta.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = count - 1; i >= 0; i -= 1) {
      const next = (i + 1) % count;
      const span = (i + 1 < count ? distances[i + 1] : length) - distances[i];
      speeds[i] = Math.min(speeds[i], Math.sqrt(speeds[next] * speeds[next] + 2 * brake * span));
    }
  }
  return speeds;
}

/** Rival en su puesto de la grilla, detenido. Su ritmo se sortea con la semilla. */
export function createRival(setup: RivalSetup): RivalState {
  'worklet';
  const { level } = setup;
  const draw = nextRandomBetween(createRandomState(setup.seed), level.paceMin, level.paceMax);
  const sim = createDrivingSim(setup.car);
  return {
    id: setup.id,
    driver: {
      level,
      pace: draw.value,
      random: draw.state,
      lineOffset: 0,
      lineTarget: 0,
      speedScale: 1,
      nextDrawTick: 0,
    },
    // El progreso de la grilla ya está leído: ordena a los autos antes de largar.
    sim: { ...sim, laps: { ...sim.laps, progress: setup.startProgress } },
    finishTick: null,
  };
}

/**
 * Paso del azar del rival: cada `lineChangeSeconds` sortea hacia dónde se desvía de la
 * trazada y cuánto se pasa o se queda en la velocidad objetivo; entre sorteos se corre
 * hacia el desvío a `lineRate`. El desvío se limita a una parte del ancho libre.
 */
function stepDriver(driver: RivalDriver, tick: number, limit: number, dt: number): RivalDriver {
  'worklet';
  const { level } = driver;
  let { random, lineTarget, speedScale, nextDrawTick } = driver;
  if (tick >= nextDrawTick) {
    const reach = Math.min(level.lineError, limit * 0.4);
    const line = nextRandomBetween(random, -reach, reach);
    const speed = nextRandomBetween(line.state, 1 - level.speedError, 1 + level.speedError * 0.5);
    random = speed.state;
    lineTarget = line.value;
    speedScale = speed.value;
    nextDrawTick = tick + Math.max(1, Math.round(level.lineChangeSeconds / dt));
  }
  const maxMove = level.lineRate * dt;
  const lineOffset = driver.lineOffset + clamp(lineTarget - driver.lineOffset, -maxMove, maxMove);
  return { ...driver, random, lineTarget, speedScale, nextDrawTick, lineOffset };
}

/**
 * Entrada del rival: la misma que el jugador (dirección y freno), sin atajos de física.
 * Dirección: persecución pura hacia un punto de la trazada, adelante a una distancia que
 * crece con la velocidad (y corrido por el desvío del rival). Freno: proporcional a lo
 * que se pasa de la velocidad objetivo del tramo (`profile`, con su ritmo, su error y el
 * ajuste por la distancia al jugador: `playerDistance`, la distancia de carrera del jugador).
 * El objetivo nunca pasa de `maxPace` veces el límite seguro del tramo.
 */
export function getRivalInput(
  rival: RivalState,
  circuit: Circuit,
  profile: readonly number[],
  config: DrivingConfig,
  playerDistance: number,
): DrivingInput {
  'worklet';
  const { driver, sim } = rival;
  const { level } = driver;
  const { car } = sim;
  const forward = getForwardSpeed(car);
  const progress = sim.laps.progress ?? 0;

  const { segment } = getSegmentAtProgress(circuit, progress);
  // Jugador adelante (gap > 0): el rival acelera; jugador atrás: se relaja. Sin pasar del perfil.
  const gap = playerDistance - getRaceDistance(sim.laps, circuit.length);
  const catchUp =
    gap > 0
      ? level.catchUpBoost * Math.min(gap / level.catchUpRange, 1)
      : -level.catchUpEase * Math.min(-gap / level.catchUpRange, 1);
  const limit = profile[segment];
  const target = Math.min(
    limit * level.maxPace,
    limit * driver.pace * driver.speedScale * (1 + catchUp),
  );

  // En una curva cerrada el límite de velocidad es bajo: mirar menos adelante evita cortarla.
  const lookAhead = Math.min(
    level.lookAheadMin + level.lookAheadTime * Math.max(forward, 0),
    Math.max(MIN_LOOK_AHEAD, limit * level.lookAheadCurveTime),
  );
  const aim = getPoseAtProgress(circuit, progress + lookAhead, driver.lineOffset);
  const dx = aim.x - car.x;
  const dz = aim.z - car.z;
  const alpha = wrapAngle(Math.atan2(dx, -dz) - car.heading);
  const distance = Math.max(Math.hypot(dx, dz), 1);
  const wheel = Math.atan((2 * config.wheelbase * Math.sin(alpha)) / distance);
  const maxWheel = getMaxSteerAngle(forward, config);
  const steer = maxWheel > 0 ? clamp(wheel / maxWheel, -1, 1) : 0;

  const brake = clamp((forward - target) * level.brakeGain, 0, 1);
  return { steer, brake };
}

/**
 * Un paso fijo del rival. Corre con el mismo modelo de manejo, los mismos límites de
 * pista y las mismas vueltas que el jugador. Al completar la última vuelta frena solo
 * (`coastConfig`: sin acelerador), siguiendo la trazada, como el jugador tras la llegada.
 */
export function stepRival(
  rival: RivalState,
  circuit: Circuit,
  profile: readonly number[],
  config: DrivingConfig,
  coastConfig: DrivingConfig,
  rules: RivalRules,
  dt: number,
  playerDistance: number,
): RivalState {
  'worklet';
  const tick = rival.sim.tick + 1;
  const driver = stepDriver(rival.driver, tick, getTrackLimit(circuit, config), dt);
  const input = getRivalInput({ ...rival, driver }, circuit, profile, config, playerDistance);
  if (rival.finishTick !== null) {
    const sim = stepDrivingSim(
      rival.sim,
      { steer: input.steer, brake: rules.finishBrake },
      coastConfig,
      circuit,
      dt,
    );
    return { ...rival, driver, sim };
  }
  const sim = stepDrivingSim(rival.sim, input, config, circuit, dt);
  return {
    ...rival,
    driver,
    sim,
    finishTick: sim.laps.lapTicks.length >= rules.totalLaps ? sim.tick : null,
  };
}
