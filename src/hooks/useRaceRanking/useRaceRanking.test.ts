import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { createEventBus } from '@/core/EventBus';
import { getBestRace, withLapRecord, withRaceRecord } from '@/core/Profiles';
import type { RaceEvent } from '@/core/RaceFlow';
import {
  createPlayerProfile,
  readProfiles,
  reloadProfiles,
  selectPlayerProfile,
  updateProfiles,
} from '@/hooks/useProfiles';

import { useRaceRanking } from './useRaceRanking';

const storage = Storage as unknown as { __reset: () => void };

const LAGO = 'autodromo-del-lago';
const HZ = 60;

/** Llegada de una carrera con esas vueltas, en pasos (60 por segundo). */
const finish = (lapTicks: number[]): RaceEvent => ({
  type: 'finish',
  tick: 99999,
  totalTicks: lapTicks.reduce((sum, ticks) => sum + ticks, 0),
  lapTicks,
  bestLapTicks: Math.min(...lapTicks),
  bestLapIndex: lapTicks.indexOf(Math.min(...lapTicks)),
  newRecord: false,
  previousRecordTicks: null,
});

function create(name: string) {
  const result = createPlayerProfile({ name, colorId: 'blue', number: 7 });
  return result.ok ? result.profile.id : '';
}

async function setup() {
  const bus = createEventBus<RaceEvent>();
  const hook = await renderHook(() => useRaceRanking({ bus, circuitId: LAGO, stepHz: HZ }));
  const emit = (...events: RaceEvent[]) => act(() => bus.emitAll(events));
  return { ...hook, bus, emit };
}

describe('useRaceRanking', () => {
  let tomi = '';
  let male = '';

  beforeEach(async () => {
    storage.__reset();
    await act(() => {
      reloadProfiles();
      tomi = create('Tomi');
      male = create('Male'); // queda activo
      // Tomi ya corrió: 1:10 de vuelta y 3:30 de carrera.
      updateProfiles((state) =>
        withRaceRecord(withLapRecord(state, tomi, LAGO, 70000, 1)!, tomi, LAGO, 3, 210000, 1)!,
      );
    });
  });

  it('antes de llegar no hay ranking', async () => {
    const { result, emit } = await setup();
    await emit({ type: 'lightsOut', tick: 0 });
    expect(result.current.ranking).toBeNull();
  });

  it('al llegar guarda el total de la carrera en el perfil activo', async () => {
    const { emit } = await setup();
    await emit({ type: 'lightsOut', tick: 0 }, finish([4320, 4320, 4320]));
    expect(getBestRace(readProfiles(), male, LAGO, 3)).toBe(216000);
  });

  it('compara las dos tablas con el ranking de antes de largar', async () => {
    const { result, emit } = await setup();
    await emit({ type: 'lightsOut', tick: 0 });
    // Durante la carrera, useBestLapRecord guarda la mejor vuelta (antes de la llegada).
    await act(() => updateProfiles((state) => withLapRecord(state, male, LAGO, 69000, 2)!));
    await emit(finish([4140, 4140, 4140])); // 3:27 en total: mejor que Tomi (3:30)
    const ranking = result.current.ranking!;
    expect(ranking.lap).toMatchObject({ position: 1, previousPosition: null, trackRecord: true });
    expect(ranking.race).toMatchObject({ position: 1, trackRecord: true, total: 2 });
    expect(ranking.race.overtaken.map((profile) => profile.name)).toEqual(['Tomi']);
    expect(ranking.celebration).toBe('trackRecord');
  });

  it('sin mejorar, dice el puesto y cuánto le falta, sin celebración', async () => {
    await act(() => updateProfiles((state) => withRaceRecord(state, male, LAGO, 3, 215000, 2)!));
    const { result, emit } = await setup();
    await emit({ type: 'lightsOut', tick: 0 }, finish([4400, 4400, 4400])); // 3:40
    const ranking = result.current.ranking!;
    expect(ranking.race).toMatchObject({ position: 2, personalBest: false, gapToAboveMs: 5000 });
    expect(ranking.race.above?.profile.name).toBe('Tomi');
    expect(ranking.celebration).toBeNull();
    expect(getBestRace(readProfiles(), male, LAGO, 3)).toBe(215000);
  });

  it('cada cantidad de vueltas es su tabla', async () => {
    const { result, emit } = await setup();
    await emit({ type: 'lightsOut', tick: 0 }, finish([4400]));
    expect(result.current.ranking!.race).toMatchObject({
      table: { kind: 'race', laps: 1 },
      position: 1,
      total: 1,
    });
    expect(result.current.ranking!.celebration).toBe('personalBest');
  });

  it('al volver a la grilla (Otra vez) se olvida', async () => {
    const { result, emit } = await setup();
    await emit({ type: 'lightsOut', tick: 0 }, finish([4400]));
    await emit({ type: 'phase', tick: 0, from: 'finished', to: 'grid' });
    expect(result.current.ranking).toBeNull();
  });

  it('sin perfil activo no guarda ni compara', async () => {
    await act(() => {
      selectPlayerProfile(tomi);
      updateProfiles((state) => ({ ...state, activeProfileId: null }));
    });
    const { result, emit } = await setup();
    await emit({ type: 'lightsOut', tick: 0 }, finish([4400]));
    expect(result.current.ranking).toBeNull();
    expect(readProfiles().raceRecords).toHaveLength(1);
  });
});
