import { DEFAULT_COLLISION_CONFIG, resolveCarCollisions } from '@/core/CarCollisions';
import type { CollisionConfig } from '@/core/CarCollisions';
import { getSpeed } from '@/core/DrivingModel';
import type { CarState, DrivingConfig, DrivingInput } from '@/core/DrivingModel';
import { createDrivingSim, interpolateCar, stepDrivingSim } from '@/core/DrivingSim';
import type { DrivingSimState } from '@/core/DrivingSim';
import { consumeFrameTime, getStepAlpha } from '@/core/FixedStep';
import type { FixedStepConfig } from '@/core/FixedStep';
import { getGhostSampleGap } from '@/core/Ghost';
import { getRaceDistance, getStandings } from '@/core/RacePositions';
import type { PositionEntry, RacePlaceView, Standing } from '@/core/RacePositions';
import { createRival, stepRival } from '@/core/RivalAI';
import type { RivalState } from '@/core/RivalAI';
import { createRandomState, nextRandomBetween } from '@/core/SeededRandom';
import { getKerbFactor, getNearestOnCenterline, getProgressAt } from '@/core/Track';
import type { Circuit } from '@/core/Track';
import { resolveTrackContact } from '@/core/TrackBounds';

import type {
  ClassificationEntry,
  RaceConfig,
  RaceEvent,
  RaceLapView,
  RaceResults,
  RaceSetup,
  RaceState,
} from './RaceFlow.types';

/**
 * Reglas por defecto: 3 vueltas; semáforo de 5 luces, una por segundo, y una
 * espera al azar de 0,5 a 1,5 s (la del handoff) antes de apagarlas.
 */
export const DEFAULT_RACE_CONFIG: RaceConfig = Object.freeze({
  totalLaps: 3,
  lightCount: 5,
  lightInterval: 1,
  lightsOutDelayMin: 0.5,
  lightsOutDelayMax: 1.5,
  borderHitInterval: 0.5,
  kerbInterval: 0.3,
  carHitInterval: 0.4,
  finishBrake: 0.5,
});

/** Cantidad de vueltas que puede elegir el jugador: de 1 a 10. */
export const MIN_RACE_LAPS = 1;
export const MAX_RACE_LAPS = 10;

/** Identificador del jugador en las posiciones; los rivales traen el suyo. */
export const PLAYER_ID = 'player';

/** Segundos a pasos de simulación, redondeado y al menos 1. */
function secondsToTicks(seconds: number, stepHz: number): number {
  'worklet';
  return Math.max(1, Math.round(seconds * stepHz));
}

/**
 * Carrera nueva en la grilla: los autos quietos, las luces apagadas y el cronómetro
 * en 0. La espera del semáforo se sortea acá con la semilla. Con `setup.field`, los
 * rivales esperan en su puesto y el progreso del jugador en la grilla ya está leído.
 */
export function createRace(setup: RaceSetup): RaceState {
  'worklet';
  const { config } = setup;
  const draw = nextRandomBetween(
    createRandomState(setup.seed),
    config.lightsOutDelayMin,
    config.lightsOutDelayMax,
  );
  const { field } = setup;
  const sim = createDrivingSim(setup.car);
  return {
    phase: 'grid',
    pausedPhase: null,
    tick: 0,
    phaseTick: 0,
    lightsOn: 0,
    lightsOutDelay: draw.value,
    random: draw.state,
    seed: setup.seed,
    stepHz: setup.stepHz,
    config,
    sim: field ? { ...sim, laps: { ...sim.laps, progress: field.playerProgress } } : sim,
    lapEndTicks: [],
    finishTick: null,
    previousRecordTicks: setup.recordTicks,
    recordTicks: setup.recordTicks,
    newRecord: false,
    lastBorderHitTick: null,
    lastKerbTick: null,
    carContact: false,
    lastCarHitTick: null,
    lapTrace: [],
    lapLength: field ? field.lapLength : 0,
    rivals: field ? field.rivals.map((rival) => createRival(rival)) : [],
    speedProfile: field ? field.speedProfile : [],
    events: [],
  };
}

/** Resultados a partir del final de cada vuelta (pasos del cronómetro). */
function buildResults(
  lapEndTicks: number[],
  finishTick: number,
  newRecord: boolean,
  previousRecordTicks: number | null,
): RaceResults {
  'worklet';
  const lapTicks = lapEndTicks.map((end, i) => end - (i > 0 ? lapEndTicks[i - 1] : 0));
  const bestLapTicks = Math.min(...lapTicks);
  return {
    totalTicks: finishTick,
    lapTicks,
    bestLapTicks,
    bestLapIndex: lapTicks.indexOf(bestLapTicks),
    newRecord,
    previousRecordTicks,
  };
}

/** Paso, contado desde que empezó el semáforo, en que se encienden todas las luces. */
export function getAllLightsOnTick(race: RaceState): number {
  'worklet';
  return race.config.lightCount * secondsToTicks(race.config.lightInterval, race.stepHz);
}

/** Paso, contado desde que empezó el semáforo, en que se apagan las luces. */
export function getLightsOutTick(race: RaceState): number {
  'worklet';
  return getAllLightsOnTick(race) + Math.round(race.lightsOutDelay * race.stepHz);
}

/**
 * Si un contacto (borde o piano) se avisa: tiene que empezar en este paso y haber
 * pasado el tiempo mínimo desde el último aviso. Así, deslizarse contra el borde
 * es un solo toque, y el roce que se corta y vuelve enseguida no se repite.
 */
export function shouldNotifyContact(
  wasActive: boolean,
  isActive: boolean,
  lastTick: number | null,
  tick: number,
  minGapTicks: number,
): boolean {
  'worklet';
  return isActive && !wasActive && (lastTick === null || tick - lastTick >= minGapTicks);
}

/** Semáforo: enciende las luces que tocan y, al final de la espera, las apaga. */
function stepLights(race: RaceState, tick: number): RaceState {
  'worklet';
  const elapsed = tick - race.phaseTick;
  const interval = secondsToTicks(race.config.lightInterval, race.stepHz);
  const lit = Math.min(race.config.lightCount, Math.floor(elapsed / interval));
  let events = race.events;
  let lightsOn = race.lightsOn;
  while (lightsOn < lit) {
    lightsOn += 1;
    events = [...events, { type: 'lightOn', tick, light: lightsOn }];
  }
  if (elapsed < getLightsOutTick(race)) {
    return { ...race, tick, lightsOn, events };
  }
  return {
    ...race,
    tick,
    phase: 'racing',
    phaseTick: tick,
    lightsOn: 0,
    // La grabación de la vuelta 1 empieza en la grilla, al apagarse las luces.
    lapTrace: [race.sim.car.x, race.sim.car.z, race.sim.car.heading],
    events: [
      ...events,
      { type: 'lightsOut', tick },
      { type: 'phase', tick, from: 'lights', to: 'racing' },
    ],
  };
}

/** Un paso de cada rival con su IA. Los que ya llegaron frenan solos, sin acelerador. */
function stepRivals(
  race: RaceState,
  drivingConfig: DrivingConfig,
  coastConfig: DrivingConfig,
  circuit: Circuit,
  dt: number,
): RivalState[] {
  'worklet';
  const { rivals } = race;
  if (rivals.length === 0) {
    return rivals;
  }
  const rules = { totalLaps: race.config.totalLaps, finishBrake: race.config.finishBrake };
  const playerDistance = getRaceDistance(race.sim.laps, race.lapLength);
  const next: RivalState[] = [];
  for (let i = 0; i < rivals.length; i += 1) {
    next.push(
      stepRival(
        rivals[i],
        circuit,
        race.speedProfile,
        drivingConfig,
        coastConfig,
        rules,
        dt,
        playerDistance,
      ),
    );
  }
  return next;
}

/** Pasadas de separación y vuelta al asfalto por paso: resuelven los choques en cadena. */
const COLLISION_PASSES = 3;

/** Devuelve un auto movido por un choque al asfalto (o a los pianos de las curvas). */
function keepOnTrack(
  car: CarState,
  segment: number,
  drivingConfig: DrivingConfig,
  circuit: Circuit,
  dt: number,
): CarState {
  'worklet';
  const hit = getNearestOnCenterline(circuit, car.x, car.z, segment);
  const kerbFactor = getKerbFactor(circuit.kerbs, circuit.length, getProgressAt(circuit, hit));
  return resolveTrackContact(car, hit, circuit, drivingConfig, dt, kerbFactor).car;
}

/**
 * Choques entre el jugador y los rivales de un paso (`core/CarCollisions`). Tras cada
 * separación, los autos movidos vuelven a la pista: un empujón nunca saca a nadie. Si eso
 * los deja solapados otra vez, se repite hasta `COLLISION_PASSES` veces; lo que quede se
 * resuelve en el paso siguiente. `touching` e `impactSpeed` son del jugador, en la primera
 * pasada (la velocidad con que se acercaba al chocar, antes del empujón).
 */
function resolveRaceCollisions(
  sim: DrivingSimState,
  rivals: RivalState[],
  collision: CollisionConfig,
  drivingConfig: DrivingConfig,
  circuit: Circuit,
  dt: number,
): { sim: DrivingSimState; rivals: RivalState[]; touching: boolean; impactSpeed: number } {
  'worklet';
  const unchanged = { sim, rivals, touching: false, impactSpeed: 0 };
  if (!collision.enabled || rivals.length === 0) {
    return unchanged;
  }
  const segments = [sim.trackSegment];
  let cars = [sim.car];
  for (let i = 0; i < rivals.length; i += 1) {
    cars.push(rivals[i].sim.car);
    segments.push(rivals[i].sim.trackSegment);
  }
  let touching = false;
  let impactSpeed = 0;
  let changed = false;
  for (let pass = 0; pass < COLLISION_PASSES; pass += 1) {
    const resolved = resolveCarCollisions(cars, collision, dt);
    if (pass === 0) {
      touching = resolved.touching[0];
      impactSpeed = resolved.impactSpeeds[0];
    }
    const next: CarState[] = [];
    let moved = false;
    for (let k = 0; k < cars.length; k += 1) {
      if (resolved.cars[k] === cars[k]) {
        next.push(cars[k]);
      } else {
        moved = true;
        next.push(keepOnTrack(resolved.cars[k], segments[k], drivingConfig, circuit, dt));
      }
    }
    if (!moved) {
      break;
    }
    changed = true;
    cars = next;
  }
  if (!changed) {
    return unchanged;
  }
  return {
    sim: { ...sim, car: cars[0] },
    rivals: rivals.map((rival, i) => ({ ...rival, sim: { ...rival.sim, car: cars[i + 1] } })),
    touching,
    impactSpeed,
  };
}

/**
 * En carrera: un paso del auto, los avisos de bordes y pianos, las vueltas y la llegada,
 * y un paso de cada rival.
 */
function stepRacing(
  race: RaceState,
  tick: number,
  input: DrivingInput,
  drivingConfig: DrivingConfig,
  coastConfig: DrivingConfig,
  circuit: Circuit,
  collisionConfig: CollisionConfig,
  dt: number,
): RaceState {
  'worklet';
  const { config, stepHz } = race;
  const before = race.sim.contact;
  const driven = stepDrivingSim(race.sim, input, drivingConfig, circuit, dt);
  const clock = driven.tick;
  let events = race.events;
  let { lastBorderHitTick, lastKerbTick } = race;

  const borderGap = secondsToTicks(config.borderHitInterval, stepHz);
  if (
    shouldNotifyContact(
      before.touching,
      driven.contact.touching,
      lastBorderHitTick,
      clock,
      borderGap,
    )
  ) {
    events = [...events, { type: 'borderHit', tick, impactSpeed: driven.contact.impactSpeed }];
    lastBorderHitTick = clock;
  }
  const kerbGap = secondsToTicks(config.kerbInterval, stepHz);
  if (shouldNotifyContact(before.onKerb, driven.contact.onKerb, lastKerbTick, clock, kerbGap)) {
    events = [...events, { type: 'kerbEnter', tick, speed: getSpeed(driven.car) }];
    lastKerbTick = clock;
  }

  const crash = resolveRaceCollisions(
    driven,
    stepRivals(race, drivingConfig, coastConfig, circuit, dt),
    collisionConfig,
    drivingConfig,
    circuit,
    dt,
  );
  const { sim, rivals } = crash;
  const carGap = secondsToTicks(config.carHitInterval, stepHz);
  let { lastCarHitTick } = race;
  if (shouldNotifyContact(race.carContact, crash.touching, lastCarHitTick, clock, carGap)) {
    events = [...events, { type: 'carHit', tick, impactSpeed: crash.impactSpeed }];
    lastCarHitTick = clock;
  }
  const stepped = {
    ...race,
    tick,
    sim,
    rivals,
    events,
    lastBorderHitTick,
    lastKerbTick,
    carContact: crash.touching,
    lastCarHitTick,
  };
  const lapStart = race.lapEndTicks.length > 0 ? race.lapEndTicks[race.lapEndTicks.length - 1] : 0;
  const pose = [sim.car.x, sim.car.z, sim.car.heading];
  // Las puertas del circuito validan cada vuelta (`LapTimer`). Una vuelta deshecha
  // (volver marcha atrás sobre la meta) no se cuenta dos veces: la carrera solo
  // suma vueltas cuando el contador supera las que ya terminó.
  if (sim.laps.lapTicks.length <= race.lapEndTicks.length) {
    // Una muestra del fantasma cada pocos pasos, contados desde el inicio de la vuelta.
    return (clock - lapStart) % getGhostSampleGap(stepHz) === 0
      ? { ...stepped, lapTrace: [...race.lapTrace, ...pose] }
      : stepped;
  }
  const lapTicks = clock - lapStart;
  const lapEndTicks = [...race.lapEndTicks, clock];
  const lap = lapEndTicks.length;
  events = [...events, { type: 'lapCompleted', tick, lap, totalLaps: config.totalLaps, lapTicks }];
  let { recordTicks, newRecord } = race;
  if (recordTicks === null || lapTicks < recordTicks) {
    events = [
      ...events,
      { type: 'newRecord', tick, lapTicks, previousTicks: recordTicks },
      // La última muestra cae en la meta: con ella la grabación dura justo lo que la vuelta.
      {
        type: 'recordTrace',
        tick,
        lapTicks,
        sampleHz: stepHz / getGhostSampleGap(stepHz),
        samples: [...race.lapTrace, ...pose],
      },
    ];
    recordTicks = lapTicks;
    newRecord = true;
  }
  if (lap < config.totalLaps) {
    // La vuelta siguiente empieza en la meta, con la pose de este paso.
    return { ...stepped, events, lapEndTicks, recordTicks, newRecord, lapTrace: pose };
  }
  // La llegada lleva los resultados completos: la pantalla no tiene que leer la carrera.
  const results = buildResults(lapEndTicks, clock, newRecord, race.previousRecordTicks);
  return {
    ...stepped,
    phase: 'finished',
    phaseTick: tick,
    lapTrace: [],
    lapEndTicks,
    finishTick: clock,
    recordTicks,
    newRecord,
    events: [
      ...events,
      { type: 'finish', tick, ...results },
      { type: 'phase', tick, from: 'racing', to: 'finished' },
    ],
  };
}

/**
 * Tras la llegada: el auto sin acelerador y con freno, hasta detenerse. Sin avisos. Los
 * rivales que todavía no llegaron siguen corriendo.
 */
function stepFinished(
  race: RaceState,
  tick: number,
  input: DrivingInput,
  drivingConfig: DrivingConfig,
  coastConfig: DrivingConfig,
  circuit: Circuit,
  collisionConfig: CollisionConfig,
  dt: number,
): RaceState {
  'worklet';
  const driven = stepDrivingSim(
    race.sim,
    { steer: input.steer, brake: race.config.finishBrake },
    coastConfig,
    circuit,
    dt,
  );
  const { sim, rivals } = resolveRaceCollisions(
    driven,
    stepRivals(race, drivingConfig, coastConfig, circuit, dt),
    collisionConfig,
    drivingConfig,
    circuit,
    dt,
  );
  return { ...race, tick, sim, rivals };
}

/**
 * Avanza la carrera con el tiempo de un cuadro, en pasos fijos. En la grilla y
 * durante el semáforo el auto no se simula (no se mueve y el cronómetro no corre);
 * en pausa no pasa nada. Los eventos de los pasos se suman a `events`. Los autos chocan
 * entre sí con `collisionConfig` (por defecto, `DEFAULT_COLLISION_CONFIG`).
 */
export function advanceRace(
  race: RaceState,
  frameMs: number,
  input: DrivingInput,
  drivingConfig: DrivingConfig,
  circuit: Circuit,
  stepConfig: FixedStepConfig,
  collisionConfig?: CollisionConfig,
): RaceState {
  'worklet';
  if (race.phase === 'paused') {
    return race;
  }
  const collision = collisionConfig ?? DEFAULT_COLLISION_CONFIG;
  const { steps, accumulatorMs } = consumeFrameTime(race.sim.accumulatorMs, frameMs, stepConfig);
  const dt = 1 / stepConfig.stepHz;
  // Sin acelerador tras la llegada: con el freno, el auto se detiene y no da marcha atrás.
  const coastConfig = { ...drivingConfig, acceleration: 0 };
  let next = race;
  for (let i = 0; i < steps; i += 1) {
    const tick = next.tick + 1;
    if (next.phase === 'lights') {
      next = stepLights(next, tick);
    } else if (next.phase === 'racing') {
      next = stepRacing(next, tick, input, drivingConfig, coastConfig, circuit, collision, dt);
    } else if (next.phase === 'finished') {
      next = stepFinished(next, tick, input, drivingConfig, coastConfig, circuit, collision, dt);
    } else {
      next = { ...next, tick };
    }
  }
  return { ...next, sim: { ...next.sim, accumulatorMs } };
}

/** Empieza el semáforo. Solo desde la grilla; si no, no cambia nada. */
export function startLights(race: RaceState): RaceState {
  'worklet';
  if (race.phase !== 'grid') {
    return race;
  }
  return {
    ...race,
    phase: 'lights',
    phaseTick: race.tick,
    lightsOn: 0,
    events: [...race.events, { type: 'phase', tick: race.tick, from: 'grid', to: 'lights' }],
  };
}

/** Pausa: congela la simulación, el semáforo y los tiempos. Solo en grilla, semáforo o carrera. */
export function pauseRace(race: RaceState): RaceState {
  'worklet';
  const { phase } = race;
  if (phase !== 'grid' && phase !== 'lights' && phase !== 'racing') {
    return race;
  }
  return {
    ...race,
    phase: 'paused',
    pausedPhase: phase,
    events: [...race.events, { type: 'phase', tick: race.tick, from: phase, to: 'paused' }],
  };
}

/** Sale de la pausa al estado en que estaba. Si no está en pausa, no cambia nada. */
export function resumeRace(race: RaceState): RaceState {
  'worklet';
  if (race.phase !== 'paused' || race.pausedPhase === null) {
    return race;
  }
  const to = race.pausedPhase;
  return {
    ...race,
    phase: to,
    pausedPhase: null,
    events: [...race.events, { type: 'phase', tick: race.tick, from: 'paused', to }],
  };
}

/** Carrera nueva en la grilla (desde cualquier estado), con el aviso del cambio. */
export function restartRace(race: RaceState, setup: RaceSetup): RaceState {
  'worklet';
  const fresh = createRace(setup);
  const event: RaceEvent = { type: 'phase', tick: 0, from: race.phase, to: 'grid' };
  return { ...fresh, events: [event] };
}

/** Retira los eventos pendientes: los devuelve y deja la carrera sin ellos. */
export function takeRaceEvents(race: RaceState): { race: RaceState; events: RaceEvent[] } {
  'worklet';
  if (race.events.length === 0) {
    return { race, events: race.events };
  }
  return { race: { ...race, events: [] }, events: race.events };
}

/** Cronómetro de la carrera, en pasos: desde la largada; tras la llegada, el total. */
export function getRaceClockTicks(race: RaceState): number {
  'worklet';
  return race.finishTick ?? race.sim.tick;
}

/** Vuelta en curso y su tiempo, para el HUD. Tras la llegada, la última vuelta completa. */
export function getRaceLapView(race: RaceState): RaceLapView {
  'worklet';
  const totalLaps = race.config.totalLaps;
  const ends = race.lapEndTicks;
  const done = ends.length;
  if (race.finishTick !== null) {
    return {
      lap: Math.min(done, totalLaps),
      totalLaps,
      lapTicks: race.finishTick - (done >= 2 ? ends[done - 2] : 0),
    };
  }
  return {
    lap: Math.min(done + 1, totalLaps),
    totalLaps,
    lapTicks: race.sim.tick - (done > 0 ? ends[done - 1] : 0),
  };
}

/**
 * Tiempo de la vuelta en curso, en milisegundos, con la fracción del paso que se está
 * acumulando (la misma con que se interpola el auto dibujado). Es el reloj con que se
 * reproduce el fantasma. Antes de largar es 0; tras la llegada, la última vuelta.
 */
export function getRaceLapClockMs(race: RaceState): number {
  'worklet';
  const racing =
    race.phase === 'racing' || (race.phase === 'paused' && race.pausedPhase === 'racing');
  const fraction = racing ? race.sim.accumulatorMs : 0;
  return (getRaceLapView(race).lapTicks * 1000) / race.stepHz + fraction;
}

/**
 * Los rivales a dibujar en este cuadro: cada auto interpolado entre sus dos últimos pasos
 * con la misma fracción de paso que el del jugador (`getRenderCar`).
 */
export function getRenderRivals(race: RaceState, stepConfig: FixedStepConfig): CarState[] {
  'worklet';
  const alpha = getStepAlpha(race.sim.accumulatorMs, stepConfig);
  const cars: CarState[] = [];
  for (let i = 0; i < race.rivals.length; i += 1) {
    const { sim } = race.rivals[i];
    cars.push(interpolateCar(sim.previousCar, sim.car, alpha));
  }
  return cars;
}

/**
 * Puesto de cada auto (el jugador con `PLAYER_ID`, los rivales con su id). Cuenta
 * vueltas completas más progreso en la vuelta; los que llegaron van primero, por orden de
 * llegada. Sin rivales, el jugador es el 1.
 */
export function getRaceStandings(race: RaceState): Standing[] {
  'worklet';
  const entries: PositionEntry[] = [];
  for (let i = 0; i < race.rivals.length; i += 1) {
    const rival = race.rivals[i];
    entries.push({
      id: rival.id,
      raceDistance: getRaceDistance(rival.sim.laps, race.lapLength),
      finishTick: rival.finishTick,
    });
  }
  // El jugador va último: en un empate, lo gana el rival (la grilla lo pone detrás).
  entries.push({
    id: PLAYER_ID,
    raceDistance: getRaceDistance(race.sim.laps, race.lapLength),
    finishTick: race.finishTick,
  });
  return getStandings(entries);
}

/** Puesto del jugador y autos en carrera, para el HUD ("2/4"). */
export function getRacePlace(race: RaceState): RacePlaceView {
  'worklet';
  const standings = getRaceStandings(race);
  const player = standings[standings.length - 1];
  return { place: player.place, total: standings.length };
}

/**
 * Clasificación de todos los autos, del primero al último: el puesto, la vuelta en curso
 * (de 1 a `totalLaps`) y el paso de la llegada (`null` si todavía corre). Para la tabla
 * del HUD y los resultados. Sin rivales, solo el jugador.
 */
export function getRaceClassification(race: RaceState): ClassificationEntry[] {
  'worklet';
  const laps = new Map<string, number>();
  const finishes = new Map<string, number | null>();
  laps.set(PLAYER_ID, race.sim.laps.lapTicks.length + 1);
  finishes.set(PLAYER_ID, race.finishTick);
  for (let i = 0; i < race.rivals.length; i += 1) {
    const rival = race.rivals[i];
    laps.set(rival.id, rival.sim.laps.lapTicks.length + 1);
    finishes.set(rival.id, rival.finishTick);
  }
  const standings = getRaceStandings(race);
  const rows: ClassificationEntry[] = [];
  for (let i = 0; i < standings.length; i += 1) {
    const { id, place } = standings[i];
    rows[place - 1] = {
      id,
      place,
      lap: Math.min(laps.get(id) ?? 1, race.config.totalLaps),
      finishTick: finishes.get(id) ?? null,
    };
  }
  return rows;
}

/** Resultados de la carrera terminada; `null` si todavía no llegó. */
export function getRaceResults(race: RaceState): RaceResults | null {
  'worklet';
  if (race.finishTick === null || race.lapEndTicks.length === 0) {
    return null;
  }
  return buildResults(race.lapEndTicks, race.finishTick, race.newRecord, race.previousRecordTicks);
}

/** Los resultados que trae el evento de llegada. */
export function getFinishResults(event: Extract<RaceEvent, { type: 'finish' }>): RaceResults {
  'worklet';
  const { type, tick, ...results } = event;
  return results;
}
