import { getCarColor } from '@/core/CarPalette';
import type { CarColorId } from '@/core/CarPalette';
import { getForwardSpeed, getMaxSteerAngle } from '@/core/DrivingModel';
import type { DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import { createDrivingSim, stepDrivingSim } from '@/core/DrivingSim';
import type { DrivingSimState } from '@/core/DrivingSim';
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
  TrafficCar,
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
    catchUpEase: 0.06,
    maxPace: 0.97,
    speedError: 0.06,
    reactRange: 60,
    defendStrength: 0.3,
    passGap: 3.4,
    sideSpace: 3.6,
    followDistance: 12,
    tacticRate: 1.5,
    tacticHold: 1.5,
    tacticCooldown: 4,
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
    catchUpBoost: 0.14,
    catchUpEase: 0.04,
    maxPace: 1,
    speedError: 0.04,
    reactRange: 70,
    defendStrength: 0.6,
    passGap: 3.2,
    sideSpace: 3.2,
    followDistance: 9,
    tacticRate: 2,
    tacticHold: 1.5,
    tacticCooldown: 3,
  }),
  hard: Object.freeze({
    id: 'hard',
    lookAheadMin: 9,
    lookAheadTime: 0.35,
    lookAheadCurveTime: 0.45,
    paceMin: 0.98,
    paceMax: 1.03,
    lateralAccel: 35,
    steerReserve: 0.82,
    brakeDecelFactor: 0.9,
    brakeGain: 0.5,
    lineError: 0.4,
    laneSpread: 0.5,
    lineChangeSeconds: 2,
    lineRate: 0.8,
    catchUpRange: 150,
    catchUpBoost: 0.12,
    catchUpEase: 0.02,
    maxPace: 1.04,
    speedError: 0.02,
    reactRange: 80,
    defendStrength: 1,
    passGap: 2.8,
    sideSpace: 2.5,
    followDistance: 5,
    tacticRate: 3.2,
    tacticHold: 1.2,
    tacticCooldown: 1.5,
  }),
});

/** Niveles en orden de menor a mayor dificultad. */
export const AI_LEVEL_IDS: readonly AiLevelId[] = Object.freeze(['easy', 'medium', 'hard']);

export const DEFAULT_AI_LEVEL_ID: AiLevelId = 'medium';

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
/** Hasta dónde mira adelante para decidir si maniobra con otros autos, en metros: menos que el carril, porque defender o pasar es más corto. */
const TACTIC_LOOK_AHEAD = 80;
/** Separación de los puntos que mira en ese tramo, en metros. */
const LANE_LOOK_STEP = 40;
/** Tope del desvío total de la trazada (carril más imprecisión), como fracción del ancho libre. */
const MAX_LINE_FRACTION = 0.8;
/** Velocidad mínima, en m/s, para maniobrar con otros autos: en la grilla, parados, no se pasan. */
const TACTIC_MIN_SPEED = 4;
/** Velocidad mínima que pide el auto de adelante al seguirlo, en m/s: un auto parado (el que ya llegó) se pasa, no se espera. */
const MIN_FOLLOW_SPEED = 5;
/** Tope del desvío al defender, pasar o esquivar, como fracción del ancho libre: deja margen al borde. */
const TACTIC_MAX_LINE_FRACTION = 0.65;
/** Distancia, de carrera, por debajo de la cual otro auto cuenta como "a su lado", en metros. */
const SIDE_ZONE = 5;
/** Diferencia lateral bajo la que un auto estorba el paso del otro (el ancho del auto más un margen), en metros. */
const OVERLAP = 2.9;
/** Cuánto de recta (de `getLaneScale`) pide para defender o pasar: en curva no se maniobra. */
const TACTIC_MIN_STRAIGHT = 0.5;
/** Tope de la corrección para esquivar a un auto a su lado, en metros. */
const MAX_AVOID = 4;
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
      tactic: 'none',
      tacticGoal: 0,
      tacticUntilTick: 0,
      tacticReadyTick: 0,
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
  avoid: number,
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
  // Una maniobra (defender o pasar) manda sobre la trazada; esquivar suma encima.
  const base = driver.tactic === 'none' ? lineTarget + laneOffset : driver.tacticGoal;
  const reacting = driver.tactic !== 'none' || avoid !== 0;
  const maxOffset = reacting ? Math.min(maxLine, limit * TACTIC_MAX_LINE_FRACTION) : maxLine;
  const goal = clamp(base + clamp(avoid, -MAX_AVOID, MAX_AVOID), -maxOffset, maxOffset);
  const maxMove = (reacting ? Math.max(level.lineRate, level.tacticRate) : level.lineRate) * dt;
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
  lookAhead: number,
): number {
  'worklet';
  const progress = rival.sim.laps.progress ?? 0;
  let slowest = config.maxSpeed;
  for (let ahead = 0; ahead <= lookAhead; ahead += LANE_LOOK_STEP) {
    const { segment } = getSegmentAtProgress(circuit, progress + ahead);
    slowest = Math.min(slowest, profile[segment]);
  }
  return 1 - clamp((config.maxSpeed - slowest) / (config.maxSpeed * CURVE_SPEED_SPAN), 0, 1);
}

/**
 * Lo que los demás rivales saben de un auto: dónde va en la carrera, a qué lado de la
 * trazada y a qué velocidad. El desvío sale de proyectar su posición sobre la normal del
 * trazado en su progreso (el mismo corrimiento que usa `getPoseAtProgress`).
 */
export function getTrafficCar(
  sim: DrivingSimState,
  circuit: Circuit,
  lapLength: number,
): TrafficCar {
  'worklet';
  const { car } = sim;
  const pose = getPoseAtProgress(circuit, sim.laps.progress ?? 0);
  return {
    distance: getRaceDistance(sim.laps, lapLength),
    lateral: (car.x - pose.x) * Math.cos(pose.heading) + (car.z - pose.z) * Math.sin(pose.heading),
    speed: getForwardSpeed(car),
  };
}

/** Resultado de mirar a los otros autos: el rival con su maniobra, la corrección y el tope de velocidad. */
interface TacticStep {
  driver: RivalDriver;
  /** Corrimiento lateral para no tocar a un auto a su lado, en metros. */
  avoid: number;
  /** Velocidad tope por el auto de adelante, en m/s (infinito si no hay ninguno). */
  speedCap: number;
}

/**
 * Si hay un auto adelante estorbando (con su desvío dentro de `OVERLAP` del de `lateral`),
 * ¿el lado `side` (−1 izquierda, 1 derecha) tiene lugar para pasarlo? Devuelve el desvío al
 * que apuntar, o `null` si no entra en el asfalto o hay otro auto en ese carril.
 */
function getPassGoal(
  driver: RivalDriver,
  traffic: readonly TrafficCar[],
  selfIndex: number,
  aheadIndex: number,
  side: number,
  maxLine: number,
): number | null {
  'worklet';
  const ahead = traffic[aheadIndex];
  const goal = ahead.lateral + side * driver.level.passGap;
  if (Math.abs(goal) > maxLine) {
    return null;
  }
  const me = traffic[selfIndex];
  const farGap = ahead.distance - me.distance + SIDE_ZONE;
  for (let j = 0; j < traffic.length; j += 1) {
    if (j === selfIndex || j === aheadIndex) {
      continue;
    }
    const gap = traffic[j].distance - me.distance;
    if (gap > -SIDE_ZONE && gap < farGap && Math.abs(traffic[j].lateral - goal) < OVERLAP) {
      return null;
    }
  }
  return goal;
}

/**
 * Cómo se comporta el rival con los otros autos. Todo sale de `traffic` (el jugador y los
 * rivales, del paso anterior), sin azar, así la carrera sigue siendo reproducible:
 *
 * - **Esquivar:** si un auto está a su lado (a menos de `SIDE_ZONE` m de carrera) y más cerca
 *   que `sideSpace`, se corre hacia el otro lado. Con `sideSpace` menor que el ancho del auto
 *   (nivel difícil) deja que se rocen.
 * - **Pasar:** si va pegado a un auto que le estorba y hay lugar y carril libre, apunta a un
 *   carril `passGap` al costado y lo mantiene hasta dejarlo atrás (`tacticHold` de margen).
 * - **Defender:** si un auto lo ataca desde atrás, a menos de la mitad de `reactRange` y sin
 *   quedarse, se corre hacia su línea (`defendStrength`) y la mantiene `tacticHold` segundos.
 *   Tras cada maniobra espera `tacticCooldown`: no zigzaguea.
 * - **Seguir:** si no puede pasar, no se acerca al auto de adelante más de `followDistance`.
 *
 * En curva, o casi parado, no maniobra: vuelve a su trazada.
 */
function stepTactics(
  driver: RivalDriver,
  traffic: readonly TrafficCar[],
  selfIndex: number,
  tick: number,
  dt: number,
  laneScale: number,
  limit: number,
): TacticStep {
  'worklet';
  const { level } = driver;
  const me = traffic[selfIndex];
  const maxLine = limit * TACTIC_MAX_LINE_FRACTION;
  const reach = level.reactRange;
  let aheadIndex = -1;
  let aheadGap = reach;
  let behindIndex = -1;
  let behindGap = reach;
  let avoid = 0;
  for (let j = 0; j < traffic.length; j += 1) {
    if (j === selfIndex) {
      continue;
    }
    const gap = traffic[j].distance - me.distance;
    const side = traffic[j].lateral - me.lateral;
    if (Math.abs(gap) < SIDE_ZONE) {
      const room = level.sideSpace - Math.abs(side);
      if (room > 0) {
        // Con el mismo desvío exacto, el de índice menor se va a la izquierda.
        const away = side > 0 || (side === 0 && selfIndex > j) ? -1 : 1;
        avoid += away * room;
      }
    } else if (gap > 0) {
      if (gap < aheadGap) {
        aheadGap = gap;
        aheadIndex = j;
      }
    } else if (-gap < behindGap) {
      behindGap = -gap;
      behindIndex = j;
    }
  }

  let { tactic, tacticGoal, tacticUntilTick, tacticReadyTick } = driver;
  const cooldown = Math.max(1, Math.round(level.tacticCooldown / dt));
  const hold = Math.max(1, Math.round(level.tacticHold / dt));
  const canAct = me.speed > TACTIC_MIN_SPEED && laneScale >= TACTIC_MIN_STRAIGHT;
  if (tactic === 'pass') {
    // Mientras haya un auto junto a su carril de paso o recién superado, sigue pasando.
    for (let j = 0; j < traffic.length; j += 1) {
      const gap = traffic[j].distance - me.distance;
      if (
        j !== selfIndex &&
        gap > -SIDE_ZONE * 2 &&
        gap < reach &&
        Math.abs(traffic[j].lateral - tacticGoal) < level.passGap + 1
      ) {
        tacticUntilTick = Math.max(tacticUntilTick, tick + hold);
      }
    }
  }
  if (tactic !== 'none' && (!canAct || tick >= tacticUntilTick)) {
    tactic = 'none';
    tacticReadyTick = tick + cooldown;
  }

  const blocked = aheadIndex >= 0 && Math.abs(traffic[aheadIndex].lateral - me.lateral) < OVERLAP;
  if (tactic === 'none' && canAct && tick >= tacticReadyTick) {
    if (blocked && aheadGap < Math.max(20, level.followDistance * 2.5)) {
      // Pasa por el lado con más lugar libre.
      const left = getPassGoal(driver, traffic, selfIndex, aheadIndex, -1, maxLine);
      const right = getPassGoal(driver, traffic, selfIndex, aheadIndex, 1, maxLine);
      const goal =
        left !== null && right !== null
          ? Math.abs(left) <= Math.abs(right)
            ? left
            : right
          : (left ?? right);
      if (goal !== null) {
        tactic = 'pass';
        tacticGoal = goal;
        tacticUntilTick = tick + hold;
      }
    } else if (behindIndex >= 0 && level.defendStrength > 0 && behindGap < reach * 0.5) {
      const attacker = traffic[behindIndex];
      const offset = attacker.lateral - me.lateral;
      if (attacker.speed >= me.speed - 1 && Math.abs(offset) < 2 * OVERLAP) {
        const goal = clamp(me.lateral + level.defendStrength * offset, -maxLine, maxLine);
        if (Math.abs(goal - me.lateral) > 0.3) {
          tactic = 'defend';
          tacticGoal = goal;
          tacticUntilTick = tick + hold;
        }
      }
    }
  }

  // Sin lugar para pasar (o antes de que el paso lo saque del camino), no se acerca de más.
  let speedCap = Infinity;
  if (blocked && aheadGap < level.followDistance * 2) {
    speedCap = Math.max(
      traffic[aheadIndex].speed + (aheadGap - level.followDistance) * 0.8,
      MIN_FOLLOW_SPEED,
    );
  }
  return {
    driver: { ...driver, tactic, tacticGoal, tacticUntilTick, tacticReadyTick },
    avoid,
    speedCap,
  };
}

/**
 * Entrada del rival: la misma que el jugador (dirección y freno), sin atajos de física.
 * Dirección: persecución pura hacia un punto de la trazada, adelante a una distancia que
 * crece con la velocidad (y corrido por el desvío del rival). Freno: proporcional a lo
 * que se pasa de la velocidad objetivo del tramo (`profile`, con su ritmo, su error y el
 * ajuste por la distancia al jugador: `playerDistance`, la distancia de carrera del jugador).
 * El objetivo nunca pasa de `maxPace` veces el límite seguro del tramo. `speedCap` (opcional)
 * es la velocidad tope que pide el auto de adelante (`stepTactics`).
 */
export function getRivalInput(
  rival: RivalState,
  circuit: Circuit,
  profile: readonly number[],
  config: DrivingConfig,
  playerDistance: number,
  speedCap?: number,
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
  const paced =
    limit *
    Math.min(
      1 + curve * (level.maxPace - 1),
      (1 + curve * (driver.pace * driver.speedScale - 1)) * (1 + catchUp),
    );
  // Con un auto adelante que no puede pasar, no pasa de la velocidad que lo deja a distancia.
  const target = speedCap === undefined ? paced : Math.min(paced, speedCap);

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
 * Un paso fijo del rival. `traffic` (el jugador y los rivales, en ese orden) y `selfIndex` (su
 * lugar en esa lista) son opcionales: sin ellos no ve a los otros autos. Corre con el mismo modelo de manejo, los mismos límites de
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
  traffic?: readonly TrafficCar[],
  selfIndex?: number,
): RivalState {
  'worklet';
  const tick = rival.sim.tick + 1;
  const limit = getTrackLimit(circuit, config);
  const laneScale = getLaneScale(rival, circuit, profile, config, LANE_LOOK_AHEAD);
  // Con otros autos a la vista (y sin haber llegado) maniobra; si no, corre solo.
  const react =
    traffic !== undefined && selfIndex !== undefined && rival.finishTick === null
      ? stepTactics(
          rival.driver,
          traffic,
          selfIndex,
          tick,
          dt,
          getLaneScale(rival, circuit, profile, config, TACTIC_LOOK_AHEAD),
          limit,
        )
      : null;
  const driver = stepDriver(
    react === null ? rival.driver : react.driver,
    tick,
    limit,
    dt,
    laneScale,
    react === null ? 0 : react.avoid,
  );
  const input = getRivalInput(
    { ...rival, driver },
    circuit,
    profile,
    config,
    playerDistance,
    react === null ? undefined : react.speedCap,
  );
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
