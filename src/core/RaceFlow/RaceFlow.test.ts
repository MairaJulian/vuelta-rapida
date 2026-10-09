import { createCarState, DEFAULT_DRIVING_CONFIG, getSpeed } from '@/core/DrivingModel';
import type { CarState, DrivingInput } from '@/core/DrivingModel';
import { DEFAULT_FIXED_STEP_CONFIG, getStepMs } from '@/core/FixedStep';
import { clamp, wrapAngle } from '@/core/MathUtils';
import { getStartPose, getTrackProgress, OVAL_CIRCUIT } from '@/core/Track';
import type { Circuit } from '@/core/Track';

import {
  advanceRace,
  createRace,
  DEFAULT_RACE_CONFIG,
  getAllLightsOnTick,
  getFinishResults,
  getLightsOutTick,
  getRaceClockTicks,
  getRaceLapView,
  getRaceResults,
  pauseRace,
  restartRace,
  resumeRace,
  shouldNotifyContact,
  startLights,
  takeRaceEvents,
} from './RaceFlow';
import type { RaceConfig, RaceEvent, RaceSetup, RaceState } from './RaceFlow.types';

const stepConfig = DEFAULT_FIXED_STEP_CONFIG;
const STEP_MS = getStepMs(stepConfig);
const track = OVAL_CIRCUIT;
const start = getStartPose(track);
const GO: DrivingInput = { steer: 0, brake: 0 };

function setup(overrides: Partial<RaceSetup> = {}, config: Partial<RaceConfig> = {}): RaceSetup {
  return {
    car: createCarState(start.x, start.z, start.heading),
    seed: 1234,
    recordTicks: null,
    stepHz: stepConfig.stepHz,
    config: { ...DEFAULT_RACE_CONFIG, ...config },
    ...overrides,
  };
}

/** Punto del trazado a `distance` metros de la meta. */
function pointAt(circuit: Circuit, distance: number) {
  const along = ((distance % circuit.length) + circuit.length) % circuit.length;
  let index = 0;
  while (index + 1 < circuit.distances.length && circuit.distances[index + 1] <= along) {
    index += 1;
  }
  const a = circuit.centerline[index];
  const b = circuit.centerline[(index + 1) % circuit.centerline.length];
  const end = circuit.distances[index + 1] ?? circuit.length;
  const t = (along - circuit.distances[index]) / (end - circuit.distances[index]);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/** Piloto automático simple: apunta a un punto del trazado 10 m más adelante. */
function autopilot(car: CarState): DrivingInput {
  const target = pointAt(track, getTrackProgress(track, car.x, car.z) + 10);
  const desired = Math.atan2(target.x - car.x, car.z - target.z);
  return { steer: clamp(wrapAngle(desired - car.heading) * 4, -1, 1), brake: 0 };
}

interface RunOptions {
  frames: number;
  frameMs?: number | ((frame: number) => number);
  input?: DrivingInput | ((race: RaceState) => DrivingInput);
  /** Comandos por cuadro, antes de avanzar. */
  commands?: Record<number, (race: RaceState) => RaceState>;
}

/** Corre cuadros como el loop: comando, avance y retiro de eventos. */
function run(
  race: RaceState,
  { frames, frameMs = STEP_MS, input = GO, commands = {} }: RunOptions,
) {
  let current = race;
  const events: RaceEvent[] = [];
  const history: RaceState[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    if (commands[frame]) {
      current = commands[frame](current);
    }
    const frameInput = typeof input === 'function' ? input(current) : input;
    const ms = typeof frameMs === 'function' ? frameMs(frame) : frameMs;
    const taken = takeRaceEvents(
      advanceRace(current, ms, frameInput, DEFAULT_DRIVING_CONFIG, track, stepConfig),
    );
    current = taken.race;
    events.push(...taken.events);
    history.push(current);
  }
  return { race: current, events, history };
}

/** Carrera con el semáforo empezado. */
const started = (overrides?: Partial<RaceSetup>, config?: Partial<RaceConfig>) =>
  startLights(createRace(setup(overrides, config)));

/** Pasos que dura el semáforo de una carrera recién creada. */
const lightsTicks = (race: RaceState) => getLightsOutTick(race);

/** Corre la carrera entera con el piloto automático. */
function fullRace(overrides?: Partial<RaceSetup>, config?: Partial<RaceConfig>, frames = 4000) {
  return run(started(overrides, config), {
    frames,
    input: (race) => (race.phase === 'racing' ? autopilot(race.sim.car) : GO),
  });
}

const ofType = <T extends RaceEvent['type']>(events: RaceEvent[], type: T) =>
  events.filter((event): event is Extract<RaceEvent, { type: T }> => event.type === type);

describe('createRace', () => {
  it('empieza en la grilla, con las luces apagadas y el cronómetro en 0', () => {
    const race = createRace(setup());
    expect(race.phase).toBe('grid');
    expect(race.lightsOn).toBe(0);
    expect(race.sim.tick).toBe(0);
    expect(race.sim.car).toEqual(setup().car);
    expect(race.events).toEqual([]);
    expect(getRaceLapView(race)).toEqual({ lap: 1, totalLaps: 3, lapTicks: 0 });
  });

  it('sortea la espera del semáforo con la semilla, dentro del rango', () => {
    const delays = Array.from(
      { length: 50 },
      (_, seed) => createRace(setup({ seed })).lightsOutDelay,
    );
    delays.forEach((delay) => {
      expect(delay).toBeGreaterThanOrEqual(0.5);
      expect(delay).toBeLessThan(1.5);
    });
    expect(new Set(delays).size).toBeGreaterThan(40);
    expect(createRace(setup({ seed: 7 })).lightsOutDelay).toBe(
      createRace(setup({ seed: 7 })).lightsOutDelay,
    );
  });

  it('es serializable', () => {
    const race = createRace(setup());
    expect(JSON.parse(JSON.stringify(race))).toEqual(race);
  });
});

describe('transiciones', () => {
  it('la grilla espera la orden del semáforo', () => {
    const { race, events } = run(createRace(setup()), { frames: 600 });
    expect(race.phase).toBe('grid');
    expect(events).toEqual([]);
  });

  it('grilla → semáforo → carrera → llegada, en ese orden', () => {
    const { race, events } = fullRace({}, { totalLaps: 1 });
    expect(race.phase).toBe('finished');
    expect(ofType(events, 'phase').map(({ from, to }) => `${from}→${to}`)).toEqual([
      'grid→lights',
      'lights→racing',
      'racing→finished',
    ]);
  });

  it('startLights solo vale en la grilla', () => {
    const lights = started();
    expect(startLights(lights)).toBe(lights);
    const paused = pauseRace(createRace(setup()));
    expect(startLights(paused)).toBe(paused);
  });

  it('la pausa vuelve al mismo estado desde la grilla, el semáforo y la carrera', () => {
    const grid = createRace(setup());
    expect(resumeRace(pauseRace(grid)).phase).toBe('grid');
    const lights = started();
    expect(resumeRace(pauseRace(lights)).phase).toBe('lights');
    const racing = run(started(), { frames: lightsTicks(started()) + 5 }).race;
    expect(racing.phase).toBe('racing');
    const paused = pauseRace(racing);
    expect(paused.phase).toBe('paused');
    expect(paused.pausedPhase).toBe('racing');
    expect(resumeRace(paused).phase).toBe('racing');
    expect(resumeRace(paused).pausedPhase).toBeNull();
  });

  it('no se pausa una carrera terminada ni se reanuda una que no está en pausa', () => {
    const finished = fullRace({}, { totalLaps: 1 }).race;
    expect(pauseRace(finished)).toBe(finished);
    const grid = createRace(setup());
    expect(resumeRace(grid)).toBe(grid);
    expect(pauseRace(pauseRace(grid))).toEqual(pauseRace(grid));
  });

  it('reiniciar desde cualquier estado vuelve a la grilla con el aviso', () => {
    const finished = fullRace({}, { totalLaps: 1 }).race;
    const fresh = restartRace(finished, setup({ seed: 99 }));
    expect(fresh.phase).toBe('grid');
    expect(fresh.sim.tick).toBe(0);
    expect(fresh.lapEndTicks).toEqual([]);
    expect(fresh.seed).toBe(99);
    expect(fresh.events).toEqual([{ type: 'phase', tick: 0, from: 'finished', to: 'grid' }]);
    const paused = pauseRace(started());
    expect(restartRace(paused, setup()).events[0]).toMatchObject({ from: 'paused', to: 'grid' });
  });
});

describe('semáforo', () => {
  it('enciende una luz por segundo y las apaga tras la espera al azar', () => {
    const race = started();
    const { events } = run(race, { frames: lightsTicks(race) + 10 });
    const lights = ofType(events, 'lightOn');
    expect(lights.map((event) => event.light)).toEqual([1, 2, 3, 4, 5]);
    expect(lights.map((event) => event.tick)).toEqual([60, 120, 180, 240, 300]);
    const [out] = ofType(events, 'lightsOut');
    expect(out.tick).toBe(getLightsOutTick(race));
    expect(out.tick).toBe(300 + Math.round(race.lightsOutDelay * 60));
    expect(getAllLightsOnTick(race)).toBe(300);
  });

  it('las luces encendidas siguen al semáforo y quedan apagadas en la carrera', () => {
    const race = started();
    const { history } = run(race, { frames: lightsTicks(race) + 1 });
    expect(history[59].lightsOn).toBe(1);
    expect(history[299].lightsOn).toBe(5);
    expect(history[lightsTicks(race) - 2].lightsOn).toBe(5);
    expect(history[lightsTicks(race) - 1].lightsOn).toBe(0);
    expect(history[lightsTicks(race) - 1].phase).toBe('racing');
  });

  it('con otra semilla, la espera cambia', () => {
    const delays = new Set([1, 2, 3, 4, 5].map((seed) => lightsTicks(started({ seed }))));
    expect(delays.size).toBeGreaterThan(1);
  });
});

describe('el auto no se mueve antes de la largada', () => {
  it('en la grilla y durante el semáforo, aunque se doble o se frene', () => {
    const race = started();
    const input = { steer: 1, brake: 1 };
    const { history } = run(createRace(setup()), { frames: 120, input });
    const lights = run(race, { frames: lightsTicks(race) - 1, input }).history;
    [...history, ...lights].forEach((state) => {
      expect(state.sim.car).toEqual(race.sim.car);
      expect(state.sim.tick).toBe(0);
    });
  });

  it('arranca en el primer paso después de apagarse las luces', () => {
    const race = started();
    const { history } = run(race, { frames: lightsTicks(race) + 1 });
    expect(history.at(-2)!.sim.tick).toBe(0);
    expect(history.at(-1)!.sim.tick).toBe(1);
    expect(getSpeed(history.at(-1)!.sim.car)).toBeGreaterThan(0);
  });
});

describe('cronómetro', () => {
  it('arranca al apagarse las luces', () => {
    const race = started();
    const { history } = run(race, { frames: lightsTicks(race) + 30 });
    expect(getRaceLapView(history[lightsTicks(race) - 2]).lapTicks).toBe(0);
    expect(getRaceClockTicks(history[lightsTicks(race) - 1])).toBe(0);
    expect(getRaceClockTicks(history.at(-1)!)).toBe(30);
    expect(getRaceLapView(history.at(-1)!)).toEqual({ lap: 1, totalLaps: 3, lapTicks: 30 });
  });

  it('la vuelta 1 se cuenta desde la largada; la suma de las vueltas es el total', () => {
    const { race, events } = fullRace({}, { totalLaps: 2 });
    const results = getRaceResults(race)!;
    expect(results.lapTicks).toHaveLength(2);
    expect(results.lapTicks[0] + results.lapTicks[1]).toBe(results.totalTicks);
    // La primera arranca detenida y 15 m antes de la meta: es más larga.
    expect(results.lapTicks[0]).toBeGreaterThan(results.lapTicks[1]);
    expect(ofType(events, 'lapCompleted').map((event) => event.lapTicks)).toEqual(results.lapTicks);
  });

  it('el HUD pasa a la vuelta siguiente al completar una', () => {
    const { history } = fullRace({}, { totalLaps: 2 });
    const firstEnd = history.findIndex((state) => state.lapEndTicks.length === 1);
    expect(getRaceLapView(history[firstEnd - 1]).lap).toBe(1);
    expect(getRaceLapView(history[firstEnd])).toMatchObject({ lap: 2, totalLaps: 2 });
    expect(getRaceLapView(history[firstEnd]).lapTicks).toBe(0);
  });
});

describe('llegada', () => {
  it('termina al completar la cantidad de vueltas configurada', () => {
    for (const totalLaps of [1, 2]) {
      const { race, events } = fullRace({}, { totalLaps });
      expect(race.phase).toBe('finished');
      expect(race.lapEndTicks).toHaveLength(totalLaps);
      expect(ofType(events, 'lapCompleted').map((event) => event.lap)).toEqual(
        Array.from({ length: totalLaps }, (_, i) => i + 1),
      );
      // Cada vuelta dice de cuántas es la carrera: la última se reconoce sola.
      expect(ofType(events, 'lapCompleted').every((event) => event.totalLaps === totalLaps)).toBe(
        true,
      );
    }
  });

  it('la llegada lleva los resultados completos: total, vueltas, mejor y récord', () => {
    const { race, events } = fullRace({}, { totalLaps: 2 });
    const [finish] = ofType(events, 'finish');
    const results = getRaceResults(race)!;
    expect(getFinishResults(finish)).toEqual(results);
    expect(finish.bestLapTicks).toBe(Math.min(...results.lapTicks));
    expect(results.bestLapIndex).toBe(1);
    expect(results).toMatchObject({ newRecord: true, previousRecordTicks: null });
  });

  it('con un récord imbatible la llegada avisa que no hubo récord y trae el anterior', () => {
    const { events } = fullRace({ recordTicks: 1 }, { totalLaps: 1 });
    const [finish] = ofType(events, 'finish');
    expect(getFinishResults(finish)).toMatchObject({ newRecord: false, previousRecordTicks: 1 });
  });

  it('después de la llegada el cronómetro se congela y el auto frena hasta detenerse', () => {
    const { race } = fullRace({}, { totalLaps: 1 });
    const after = run(race, { frames: 600, input: { steer: 0, brake: 0 } });
    expect(getRaceClockTicks(after.race)).toBe(race.finishTick);
    expect(getRaceLapView(after.race)).toEqual(getRaceLapView(race));
    expect(getSpeed(after.race.sim.car)).toBeLessThan(1e-6);
    expect(after.events).toEqual([]);
  });

  it('antes de terminar no hay resultados', () => {
    expect(getRaceResults(started())).toBeNull();
  });
});

describe('pausa', () => {
  it('congela la simulación y los tiempos', () => {
    const race = started();
    const racing = run(race, { frames: lightsTicks(race) + 90 }).race;
    const paused = pauseRace(racing);
    const { race: after, events } = run(takeRaceEvents(paused).race, {
      frames: 300,
      input: { steer: 1, brake: 1 },
    });
    expect(after).toEqual(takeRaceEvents(paused).race);
    expect(events).toEqual([]);
    expect(getRaceLapView(after).lapTicks).toBe(getRaceLapView(racing).lapTicks);
  });

  it('congela el semáforo: la luz siguiente llega igual de tarde al volver', () => {
    const race = started();
    const { events } = run(race, {
      frames: 400,
      commands: { 30: pauseRace, 130: resumeRace },
    });
    expect(ofType(events, 'lightOn').map((event) => event.tick)).toEqual([60, 120, 180, 240, 300]);
    const lightFrames = run(race, {
      frames: 400,
      commands: { 30: pauseRace, 130: resumeRace },
    }).history.findIndex((state) => state.lightsOn === 1);
    // La primera luz llega 100 cuadros más tarde que sin pausa (cuadro 59).
    expect(lightFrames).toBe(159);
  });

  it('al volver de una pausa en carrera sigue igual que si no se hubiera pausado', () => {
    const race = started();
    const plain = run(race, { frames: 700 }).race;
    const withPause = run(race, { frames: 800, commands: { 400: pauseRace, 500: resumeRace } });
    expect({ ...withPause.race, events: [] }).toEqual({ ...plain, events: [] });
    expect(ofType(withPause.events, 'phase').map(({ from, to }) => `${from}→${to}`)).toEqual([
      'grid→lights',
      'lights→racing',
      'racing→paused',
      'paused→racing',
    ]);
  });
});

describe('eventos', () => {
  it('cada evento sale una sola vez en una carrera completa', () => {
    const { events } = fullRace({}, { totalLaps: 2 });
    expect(ofType(events, 'lightOn')).toHaveLength(5);
    expect(ofType(events, 'lightsOut')).toHaveLength(1);
    expect(ofType(events, 'lapCompleted')).toHaveLength(2);
    expect(ofType(events, 'finish')).toHaveLength(1);
    // Los pasos de los eventos nunca retroceden.
    events.forEach((event, i) => {
      if (i > 0) expect(event.tick).toBeGreaterThanOrEqual(events[i - 1].tick);
    });
  });

  it('takeRaceEvents los entrega y la carrera queda sin pendientes', () => {
    const race = startLights(createRace(setup()));
    const { race: taken, events } = takeRaceEvents(race);
    expect(events).toEqual([{ type: 'phase', tick: 0, from: 'grid', to: 'lights' }]);
    expect(taken.events).toEqual([]);
    expect(takeRaceEvents(taken).race).toBe(taken);
  });

  it('el récord: la primera vuelta sin récord previo lo marca, y luego solo las más rápidas', () => {
    const { events, race } = fullRace({}, { totalLaps: 2 });
    const records = ofType(events, 'newRecord');
    const [lap1, lap2] = getRaceResults(race)!.lapTicks;
    expect(records[0]).toMatchObject({ lapTicks: lap1, previousTicks: null });
    expect(records[1]).toMatchObject({ lapTicks: lap2, previousTicks: lap1 });
    expect(race.newRecord).toBe(true);
  });

  it('sin mejorar el récord guardado no hay récord nuevo', () => {
    const { events, race } = fullRace({ recordTicks: 100 }, { totalLaps: 1 });
    expect(ofType(events, 'newRecord')).toEqual([]);
    expect(getRaceResults(race)).toMatchObject({ newRecord: false, previousRecordTicks: 100 });
  });

  it('mejorar el récord guardado lo avisa con el anterior', () => {
    const { events } = fullRace({ recordTicks: 100000 }, { totalLaps: 1 });
    expect(ofType(events, 'newRecord')).toEqual([
      expect.objectContaining({ previousTicks: 100000 }),
    ]);
  });

  it('deslizarse contra el borde es un solo toque', () => {
    // Doblando a fondo hacia afuera de la recta: el auto llega al borde y se desliza.
    const race = started();
    const { events } = run(race, {
      frames: lightsTicks(race) + 180,
      input: (current) => (current.phase === 'racing' ? { steer: -0.4, brake: 0 } : GO),
    });
    const hits = ofType(events, 'borderHit');
    expect(hits).toHaveLength(1);
    expect(hits[0].impactSpeed).toBeGreaterThan(0);
  });

  it('pisar el piano se avisa al entrar, con la velocidad', () => {
    // Recto al final de la recta: la curva se aleja y el auto pasa por arriba del piano.
    const race = started();
    const { events } = run(race, { frames: lightsTicks(race) + 400 });
    const kerbs = ofType(events, 'kerbEnter');
    expect(kerbs.length).toBeGreaterThanOrEqual(1);
    expect(kerbs[0].speed).toBeGreaterThan(10);
    // Siguió de largo: después del piano tocó el borde exterior.
    const [hit] = ofType(events, 'borderHit');
    expect(hit.tick).toBeGreaterThan(kerbs[0].tick);
  });

  it('el aviso de contacto espera el tiempo mínimo y solo cuenta contactos nuevos', () => {
    expect(shouldNotifyContact(false, true, null, 10, 30)).toBe(true);
    expect(shouldNotifyContact(true, true, null, 10, 30)).toBe(false);
    expect(shouldNotifyContact(false, false, null, 10, 30)).toBe(false);
    expect(shouldNotifyContact(false, true, 0, 29, 30)).toBe(false);
    expect(shouldNotifyContact(false, true, 0, 30, 30)).toBe(true);
  });
});

describe('determinismo', () => {
  it('la misma semilla y la misma entrada dan la misma carrera', () => {
    const first = fullRace({ seed: 5 }, { totalLaps: 1 });
    const second = fullRace({ seed: 5 }, { totalLaps: 1 });
    expect(second.race).toEqual(first.race);
    expect(second.events).toEqual(first.events);
  });

  it('no depende de los fps: a 60 Hz y con cuadros irregulares da la misma carrera', () => {
    const input = (race: RaceState) => (race.phase === 'racing' ? autopilot(race.sim.car) : GO);
    const at60 = run(started(), { frames: 1500, input });
    // Cuadros de 1/2 y 3/2 paso alternados: la entrada se lee igual en cada paso par.
    const irregular = run(started(), {
      frames: 1500,
      frameMs: (frame) => (frame % 2 === 0 ? STEP_MS / 2 : (STEP_MS * 3) / 2),
      input,
    });
    expect(ofType(irregular.events, 'lightsOut')).toEqual(ofType(at60.events, 'lightsOut'));
    expect(ofType(irregular.events, 'lightOn')).toEqual(ofType(at60.events, 'lightOn'));
  });

  it('el estado de una carrera completa es serializable', () => {
    const { race } = fullRace({}, { totalLaps: 1 });
    expect(JSON.parse(JSON.stringify(race))).toEqual(race);
  });
});
