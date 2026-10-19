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

/** Rivales por carrera por defecto. */
export const RIVAL_COUNT = 3;

/** Tope de rivales que se pueden elegir. */
export const MAX_RIVALS = 10;

/**
 * Niveles de dificultad. En curva, el fácil corre a un 82–90 % de lo que aguantan, con
 * trazada y frenada imprecisas; el medio, a 89–95 %, y el difícil, a 97–102 % con poco
 * error. Todos topean el ritmo (`maxPace`) para no pasarse del límite de cada tramo. En
 * recta los tres van a fondo.
 */
export const AI_LEVELS: Readonly<Record<AiLevelId, AiLevel>> = Object.freeze({
  easy: Object.freeze({
    id: 'easy',
    lookAheadMin: 9,
    lookAheadTime: 0.35,
    lookAheadCurveTime: 0.45,
    paceMin: 0.82,
    paceMax: 0.9,
    lateralAccel: 31,
    steerReserve: 0.67,
    brakeDecelFactor: 0.66,
    brakeGain: 0.3,
    lineError: 1,
    laneSpread: 0.5,
    lineChangeSeconds: 1.5,
    lineRate: 0.8,
    catchUpRange: 150,
    catchUpBoost: 0.15,
    catchUpEase: 0.12,
    maxPace: 0.97,
    speedError: 0.06,
  }),
  medium: Object.freeze({
    id: 'medium',
    lookAheadMin: 9,
    lookAheadTime: 0.35,
    lookAheadCurveTime: 0.45,
    paceMin: 0.89,
    paceMax: 0.95,
    lateralAccel: 33,
    steerReserve: 0.74,
    brakeDecelFactor: 0.78,
    brakeGain: 0.4,
    lineError: 0.7,
    laneSpread: 0.5,
    lineChangeSeconds: 1.5,
    lineRate: 0.8,
    catchUpRange: 150,
    catchUpBoost: 0.12,
    catchUpEase: 0.1,
    maxPace: 1,
    speedError: 0.04,
  }),
  hard: Object.freeze({
    id: 'hard',
    lookAheadMin: 9,
    lookAheadTime: 0.35,
    lookAheadCurveTime: 0.45,
    paceMin: 0.97,
    paceMax: 1.02,
    lateralAccel: 35,
    steerReserve: 0.82,
    brakeDecelFactor: 0.9,
    brakeGain: 0.5,
    lineError: 0.4,
    laneSpread: 0.5,
    lineChangeSeconds: 2,
    lineRate: 0.8,
    catchUpRange: 150,
    catchUpBoost: 0.1,
    catchUpEase: 0.08,
    maxPace: 1.03,
    speedError: 0.02,
  }),
});

/** Niveles en orden de menor a mayor dificultad. */
export const AI_LEVEL_IDS: readonly AiLevelId[] = Object.freeze(['easy', 'medium', 'hard']);

export const DEFAULT_AI_LEVEL_ID: AiLevelId = 'easy';

/**
 * El nivel con o sin dificultad dinámica. Sin ella los rivales no se ajustan a la
 * distancia al jugador (ni aprietan ni aflojan): corren a su ritmo sorteado.
 */
export function withDynamicDifficulty(level: AiLevel, enabled: boolean): AiLevel {
  return enabled ? level : { ...level, catchUpBoost: 0, catchUpEase: 0 };
}

/** Nombres inventados de los rivales, en orden: uno distinto por cada rival posible (`MAX_RIVALS`). */
export const RIVAL_NAMES: readonly string[] = Object.freeze([
  'Chispa',
  'Ráfaga',
  'Cometa',
  'Trueno',
  'Bólido',
  'Meteoro',
  'Relámpago',
  'Tormenta',
  'Cóndor',
  'Fulgor',
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
/**
 * Cuánto por debajo del tope del auto (fracción de `maxSpeed`) tiene que estar el límite de
 * un tramo para que se le aplique entero el ritmo del rival.
 */
const CURVE_SPEED_SPAN = 0.15;
/** Hasta dónde mira adelante el rival para saber si viene una curva y volver a la trazada, en metros. */
const LANE_LOOK_AHEAD = 200;
/** Separación de los puntos que mira en ese tramo, en metros. */
const LANE_LOOK_STEP = 40;
/** Tope del desvío total de la trazada (carril más imprecisión), como fracción del ancho libre. */
const MAX_LINE_FRACTION = 0.8;
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
  const lane = nextRandomBetween(draw.state, -1, 1);
  const sim = createDrivingSim(setup.car);
  // Sale desviado como su puesto de la grilla y se corre hacia su carril sin saltos.
  const startOffset = setup.startOffset ?? 0;
  return {
    id: setup.id,
    driver: {
      level,
      pace: draw.value,
      random: lane.state,
      lane: lane.value,
      lineOffset: startOffset,
      lineTarget: startOffset,
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
function stepDriver(
  driver: RivalDriver,
  tick: number,
  limit: number,
  dt: number,
  laneScale: number,
): RivalDriver {
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
  // El carril empuja la trazada hacia un costado en recta (`laneScale` 1) y se apaga en curva.
  const laneOffset = driver.lane * level.laneSpread * limit * laneScale;
  const maxLine = limit * MAX_LINE_FRACTION;
  const goal = clamp(lineTarget + laneOffset, -maxLine, maxLine);
  const maxMove = level.lineRate * dt;
  const lineOffset = driver.lineOffset + clamp(goal - driver.lineOffset, -maxMove, maxMove);
  return { ...driver, random, lineTarget, speedScale, nextDrawTick, lineOffset };
}

/**
 * Cuánto del carril propio puede usar el rival ahora, de 0 a 1: 1 si lo que viene en los
 * próximos `LANE_LOOK_AHEAD` metros es recta y 0 si hay una curva (con la misma transición
 * gradual que el ritmo, `CURVE_SPEED_SPAN`). Mira lejos porque el rival tarda en volver a
 * la trazada (`lineRate`).
 */
function getLaneScale(
  rival: RivalState,
  circuit: Circuit,
  profile: readonly number[],
  config: DrivingConfig,
): number {
  'worklet';
  const progress = rival.sim.laps.progress ?? 0;
  let slowest = config.maxSpeed;
  for (let ahead = 0; ahead <= LANE_LOOK_AHEAD; ahead += LANE_LOOK_STEP) {
    const { segment } = getSegmentAtProgress(circuit, progress + ahead);
    slowest = Math.min(slowest, profile[segment]);
  }
  return 1 - clamp((config.maxSpeed - slowest) / (config.maxSpeed * CURVE_SPEED_SPAN), 0, 1);
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
  // En recta va a fondo, igual que el jugador: el ritmo, el error de frenada y el tope solo
  // valen donde hay curva. `curve` va de 0 (el límite es el tope del auto) a 1 (el límite
  // está `CURVE_SPEED_SPAN` por debajo), así que la transición es gradual. En recta solo se
  // relaja si va muy adelante del jugador.
  const curve = clamp((config.maxSpeed - limit) / (config.maxSpeed * CURVE_SPEED_SPAN), 0, 1);
  const target =
    limit *
    Math.min(
      1 + curve * (level.maxPace - 1),
      (1 + curve * (driver.pace * driver.speedScale - 1)) * (1 + catchUp),
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
  const driver = stepDriver(
    rival.driver,
    tick,
    getTrackLimit(circuit, config),
    dt,
    getLaneScale(rival, circuit, profile, config),
  );
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
