import { createCarState, DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { DEFAULT_FIXED_STEP_CONFIG } from '@/core/FixedStep';
import { createLapState } from '@/core/LapTimer';
import type { LapState } from '@/core/LapTimer';
import {
  advanceRace,
  createRace,
  DEFAULT_RACE_CONFIG,
  getRacePlace,
  getRaceStandings,
  PLAYER_ID,
  startLights,
} from '@/core/RaceFlow';
import { AI_LEVELS, buildSpeedProfile, RIVAL_COUNT } from '@/core/RivalAI';
import { getGridPose, getGridProgress, OVAL_CIRCUIT } from '@/core/Track';

import { getRaceDistance, getStandings } from './RacePositions';

const LENGTH = 1000;

/** Vueltas de un auto: `lapsDone` completas y `progress` en la actual (o sin cruzar la meta). */
function lapsAt(lapsDone: number, progress: number, crossed = true): LapState {
  return {
    ...createLapState(),
    progress,
    lapStartTick: crossed ? 0 : null,
    lapTicks: Array.from({ length: lapsDone }, () => 100),
  };
}

describe('getRaceDistance', () => {
  it('suma las vueltas completas y el progreso de la vuelta actual', () => {
    expect(getRaceDistance(lapsAt(0, 250), LENGTH)).toBe(250);
    expect(getRaceDistance(lapsAt(2, 250), LENGTH)).toBe(2250);
  });

  it('antes de cruzar la meta cuenta hacia atrás y es continua al cruzarla', () => {
    expect(getRaceDistance(lapsAt(0, 985, false), LENGTH)).toBe(-15);
    expect(getRaceDistance(lapsAt(0, 5), LENGTH)).toBe(5);
    expect(getRaceDistance(lapsAt(0, 985, false), LENGTH)).toBeLessThan(
      getRaceDistance(lapsAt(0, 5), LENGTH),
    );
  });

  it('sin lectura de progreso vale lo de la grilla', () => {
    expect(getRaceDistance({ ...createLapState(), lapStartTick: null }, LENGTH)).toBe(-LENGTH);
  });
});

describe('getStandings', () => {
  const places = (entries: Parameters<typeof getStandings>[0]) =>
    Object.fromEntries(getStandings(entries).map(({ id, place }) => [id, place]));

  it('ordena por distancia de carrera', () => {
    expect(
      places([
        { id: 'a', raceDistance: 1500, finishTick: null },
        { id: 'b', raceDistance: 2400, finishTick: null },
        { id: 'c', raceDistance: 1900, finishTick: null },
      ]),
    ).toEqual({ b: 1, c: 2, a: 3 });
  });

  it('un auto con una vuelta más va delante aunque su progreso sea menor', () => {
    expect(
      places([
        { id: 'a', raceDistance: getRaceDistance(lapsAt(1, 900), LENGTH), finishTick: null },
        { id: 'b', raceDistance: getRaceDistance(lapsAt(2, 50), LENGTH), finishTick: null },
      ]),
    ).toEqual({ b: 1, a: 2 });
  });

  it('los que llegaron van primero, por orden de llegada', () => {
    expect(
      places([
        { id: 'a', raceDistance: 3000, finishTick: 5000 },
        { id: 'b', raceDistance: 2990, finishTick: null },
        { id: 'c', raceDistance: 3000, finishTick: 4900 },
      ]),
    ).toEqual({ c: 1, a: 2, b: 3 });
  });

  it('el empate lo gana el que está antes en la lista', () => {
    expect(
      places([
        { id: 'a', raceDistance: 10, finishTick: null },
        { id: 'b', raceDistance: 10, finishTick: null },
      ]),
    ).toEqual({ a: 1, b: 2 });
    expect(
      places([
        { id: 'a', raceDistance: 10, finishTick: 7 },
        { id: 'b', raceDistance: 10, finishTick: 7 },
      ]),
    ).toEqual({ a: 1, b: 2 });
  });

  it('con un solo auto, es el 1', () => {
    expect(getStandings([{ id: 'a', raceDistance: 0, finishTick: null }])).toEqual([
      { id: 'a', place: 1 },
    ]);
  });
});

describe('puestos en la carrera', () => {
  const circuit = OVAL_CIRCUIT;
  const profile = buildSpeedProfile(circuit, DEFAULT_DRIVING_CONFIG, AI_LEVELS.easy);

  function startRace() {
    const slot = (index: number) => {
      const pose = getGridPose(circuit, index);
      return createCarState(pose.x, pose.z, pose.heading);
    };
    return createRace({
      car: slot(RIVAL_COUNT),
      seed: 5,
      recordTicks: null,
      stepHz: DEFAULT_FIXED_STEP_CONFIG.stepHz,
      config: DEFAULT_RACE_CONFIG,
      field: {
        lapLength: circuit.length,
        playerProgress: getGridProgress(circuit, RIVAL_COUNT),
        speedProfile: profile,
        rivals: Array.from({ length: RIVAL_COUNT }, (_, i) => ({
          id: `rival-${i + 1}`,
          car: slot(i),
          startProgress: getGridProgress(circuit, i),
          seed: 100 + i,
          level: AI_LEVELS.easy,
        })),
      },
    });
  }

  it('en la grilla el jugador sale último y los rivales van en orden', () => {
    const race = startRace();
    expect(getRacePlace(race)).toEqual({ place: RIVAL_COUNT + 1, total: RIVAL_COUNT + 1 });
    expect(getRaceStandings(race).map(({ id }) => id)).toEqual([
      'rival-1',
      'rival-2',
      'rival-3',
      PLAYER_ID,
    ]);
    expect(getRaceStandings(race).map(({ place }) => place)).toEqual([1, 2, 3, 4]);
  });

  it('sin rivales, el jugador es el 1 de 1', () => {
    const race = createRace({
      car: createCarState(0, 0, 0),
      seed: 1,
      recordTicks: null,
      stepHz: 60,
      config: DEFAULT_RACE_CONFIG,
    });
    expect(getRacePlace(race)).toEqual({ place: 1, total: 1 });
  });

  it('los rivales largan con el semáforo y el jugador no pasa a los de adelante sin avanzar', () => {
    let race = startLights(startRace());
    const { stepHz } = DEFAULT_FIXED_STEP_CONFIG;
    // Semáforo (5 luces) y la espera máxima: después los autos corren.
    const lightsMs =
      (DEFAULT_RACE_CONFIG.lightCount + DEFAULT_RACE_CONFIG.lightsOutDelayMax) * 1000;
    race = advanceRace(
      race,
      lightsMs - 2000,
      { steer: 0, brake: 0 },
      DEFAULT_DRIVING_CONFIG,
      circuit,
      DEFAULT_FIXED_STEP_CONFIG,
    );
    expect(race.rivals.every((rival) => rival.sim.tick === 0)).toBe(true);
    for (let i = 0; i < 20 * stepHz; i += 1) {
      race = advanceRace(
        race,
        1000 / stepHz,
        { steer: 0, brake: 1 },
        DEFAULT_DRIVING_CONFIG,
        circuit,
        DEFAULT_FIXED_STEP_CONFIG,
      );
    }
    expect(race.phase).toBe('racing');
    expect(race.rivals.every((rival) => rival.sim.tick > 0)).toBe(true);
    // El jugador frenó todo el tiempo: los tres rivales le sacaron ventaja.
    expect(getRacePlace(race)).toEqual({ place: RIVAL_COUNT + 1, total: RIVAL_COUNT + 1 });
  });
});
