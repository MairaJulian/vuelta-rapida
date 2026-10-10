import {
  createProfile,
  deleteProfile,
  EMPTY_PROFILES_STATE,
  updateProfile,
  withLapRecord,
  withRaceRecord,
} from '@/core/Profiles';
import type { ProfileDraft, ProfilesState } from '@/core/Profiles';

import {
  getCelebration,
  getRaceLapCounts,
  getRaceRanking,
  getRanking,
  getRankingOutcome,
  getTableLabel,
  getTrackRecord,
  isSameTable,
  LAP_TABLE,
  raceTable,
} from './Ranking';

const LAGO = 'autodromo-del-lago';
const PUERTO = 'puerto-viejo';
const T0 = Date.UTC(2026, 9, 10);

/** Tres jugadores: Male (p1), Tomi (p2) y Luli (p3). */
function players(): ProfilesState {
  const drafts: [string, ProfileDraft][] = [
    ['p1', { name: 'Male', colorId: 'pink', number: 27 }],
    ['p2', { name: 'Tomi', colorId: 'teal', number: 7 }],
    ['p3', { name: 'Luli', colorId: 'orange', number: 14 }],
  ];
  return drafts.reduce((state, [id, draft]) => {
    const result = createProfile(state, draft, { id, now: T0 });
    if (!result.ok) throw new Error(result.errors.join());
    return result.state;
  }, EMPTY_PROFILES_STATE);
}

/** Aplica vueltas `[perfil, ms, cuándo]` en el Lago. */
function laps(state: ProfilesState, entries: [string, number, number][]) {
  return entries.reduce(
    (current, [id, ms, at]) => withLapRecord(current, id, LAGO, ms, T0 + at) ?? current,
    state,
  );
}

/** Aplica carreras `[perfil, vueltas, ms, cuándo]` en el Lago. */
function races(state: ProfilesState, entries: [string, number, number, number][]) {
  return entries.reduce(
    (current, [id, count, ms, at]) =>
      withRaceRecord(current, id, LAGO, count, ms, T0 + at) ?? current,
    state,
  );
}

const names = (state: ProfilesState, table = LAP_TABLE, circuit = LAGO) =>
  getRanking(state, circuit, table).map((row) => row.profile.name);

describe('getRanking', () => {
  it('ordena por tiempo, del más rápido al más lento', () => {
    const state = laps(players(), [
      ['p1', 72000, 1],
      ['p2', 70000, 2],
      ['p3', 75000, 3],
    ]);
    const rows = getRanking(state, LAGO, LAP_TABLE);
    expect(rows.map((row) => [row.position, row.profile.name, row.timeMs])).toEqual([
      [1, 'Tomi', 70000],
      [2, 'Male', 72000],
      [3, 'Luli', 75000],
    ]);
  });

  it('cada perfil aparece una sola vez, con su mejor tiempo', () => {
    const state = laps(players(), [
      ['p1', 72000, 1],
      ['p1', 71000, 2],
      ['p1', 74000, 3],
      ['p2', 73000, 4],
    ]);
    expect(getRanking(state, LAGO, LAP_TABLE).map((row) => [row.profile.id, row.timeMs])).toEqual([
      ['p1', 71000],
      ['p2', 73000],
    ]);
  });

  it('un tiempo peor no cambia nada; uno mejor actualiza la fila', () => {
    let state = laps(players(), [['p1', 72000, 1]]);
    state = laps(state, [['p1', 72500, 5]]);
    expect(getTrackRecord(state, LAGO, LAP_TABLE)).toMatchObject({ timeMs: 72000, setAt: T0 + 1 });
    state = laps(state, [['p1', 71500, 6]]);
    expect(getTrackRecord(state, LAGO, LAP_TABLE)).toMatchObject({ timeMs: 71500, setAt: T0 + 6 });
  });

  it('con el mismo tiempo, gana quien lo logró primero', () => {
    const state = laps(players(), [
      ['p2', 70000, 5],
      ['p1', 70000, 1],
      ['p3', 70000, 9],
    ]);
    expect(names(state)).toEqual(['Male', 'Tomi', 'Luli']);
    // Igualar el propio tiempo más tarde no le quita el lugar a nadie.
    expect(names(laps(state, [['p1', 70000, 20]]))).toEqual(['Male', 'Tomi', 'Luli']);
  });

  it('calcula la diferencia con el líder y con el de arriba', () => {
    const state = laps(players(), [
      ['p1', 72000, 1],
      ['p2', 71655, 2],
      ['p3', 75000, 3],
    ]);
    const rows = getRanking(state, LAGO, LAP_TABLE);
    expect(rows.map((row) => [row.gapToLeaderMs, row.gapToAboveMs])).toEqual([
      [0, 0],
      [345, 345],
      [3345, 3000],
    ]);
  });

  it('la carrera completa se separa por cantidad de vueltas', () => {
    const state = races(players(), [
      ['p1', 3, 200000, 1],
      ['p2', 3, 195000, 2],
      ['p1', 5, 330000, 3],
    ]);
    expect(names(state, raceTable(3))).toEqual(['Tomi', 'Male']);
    expect(names(state, raceTable(5))).toEqual(['Male']);
    expect(names(state, raceTable(1))).toEqual([]);
    expect(names(state, LAP_TABLE)).toEqual([]);
  });

  it('cada pista tiene sus tablas', () => {
    let state = laps(players(), [['p1', 72000, 1]]);
    state = withLapRecord(state, 'p2', PUERTO, 60000, T0)!;
    expect(names(state, LAP_TABLE, LAGO)).toEqual(['Male']);
    expect(names(state, LAP_TABLE, PUERTO)).toEqual(['Tomi']);
  });

  it('si se edita un perfil, el ranking muestra el nombre, el color y el número nuevos', () => {
    const state = laps(players(), [['p1', 72000, 1]]);
    const edited = updateProfile(state, 'p1', { name: 'Maca', colorId: 'violet', number: 99 });
    if (!edited.ok) throw new Error('no se pudo editar');
    expect(getTrackRecord(edited.state, LAGO, LAP_TABLE)?.profile).toMatchObject({
      id: 'p1',
      name: 'Maca',
      colorId: 'violet',
      number: 99,
    });
  });

  it('si se borra un perfil, desaparece de todas las tablas y los demás suben', () => {
    let state = laps(players(), [
      ['p1', 70000, 1],
      ['p2', 72000, 2],
    ]);
    state = races(state, [
      ['p1', 3, 200000, 1],
      ['p2', 3, 210000, 2],
    ]);
    state = deleteProfile(state, 'p1');
    expect(getRanking(state, LAGO, LAP_TABLE)).toEqual([
      expect.objectContaining({ position: 1, timeMs: 72000, gapToLeaderMs: 0 }),
    ]);
    expect(names(state, raceTable(3))).toEqual(['Tomi']);
  });

  it('ignora entradas de perfiles que no existen', () => {
    const state: ProfilesState = {
      ...players(),
      lapRecords: [{ profileId: 'fantasma', circuitId: LAGO, lapMs: 1, setAt: T0 }],
    };
    expect(getRanking(state, LAGO, LAP_TABLE)).toEqual([]);
  });
});

describe('getRaceLapCounts y getTrackRecord', () => {
  it('lista las cantidades de vueltas con tiempos, de menor a mayor', () => {
    const state = races(players(), [
      ['p1', 5, 330000, 1],
      ['p2', 3, 195000, 2],
      ['p1', 3, 200000, 3],
    ]);
    expect(getRaceLapCounts(state, LAGO)).toEqual([3, 5]);
    expect(getRaceLapCounts(state, PUERTO)).toEqual([]);
  });

  it('el récord de la pista es el líder, o null sin tiempos', () => {
    const state = laps(players(), [
      ['p1', 72000, 1],
      ['p2', 70000, 2],
    ]);
    expect(getTrackRecord(state, LAGO, LAP_TABLE)?.profile.name).toBe('Tomi');
    expect(getTrackRecord(state, PUERTO, LAP_TABLE)).toBeNull();
  });
});

describe('getTableLabel', () => {
  it('nombra cada tabla para el jugador', () => {
    expect(getTableLabel(LAP_TABLE)).toBe('Mejor vuelta');
    expect(getTableLabel(raceTable(3))).toBe('Carrera · 3 vueltas');
    expect(getTableLabel(raceTable(1))).toBe('Carrera · 1 vuelta');
  });
});

describe('getRaceRanking', () => {
  it('junta las dos tablas de la carrera y la celebración más grande', () => {
    const before = races(players(), [['p2', 3, 190000, 1]]);
    const after = races(laps(before, [['p1', 72000, 10]]), [['p1', 3, 185000, 10]]);
    const ranking = getRaceRanking(before, after, 'p1', LAGO, 3);
    expect(ranking.lap).toMatchObject({ table: LAP_TABLE, position: 1, personalBest: true });
    expect(ranking.race).toMatchObject({ table: raceTable(3), position: 1, trackRecord: true });
    expect(ranking.celebration).toBe('trackRecord');
  });
});

describe('isSameTable', () => {
  it('compara tipo y vueltas', () => {
    expect(isSameTable(LAP_TABLE, { kind: 'lap' })).toBe(true);
    expect(isSameTable(raceTable(3), raceTable(3))).toBe(true);
    expect(isSameTable(raceTable(3), raceTable(5))).toBe(false);
    expect(isSameTable(LAP_TABLE, raceTable(3))).toBe(false);
  });
});

describe('getRankingOutcome', () => {
  const base = () =>
    laps(players(), [
      ['p2', 70000, 1],
      ['p3', 71000, 2],
      ['p1', 73000, 3],
    ]); // Tomi, Luli, Male

  const outcome = (before: ProfilesState, after: ProfilesState, id = 'p1') =>
    getRankingOutcome(before, after, id, LAGO, LAP_TABLE);

  it('mejor tiempo personal sin cambiar de puesto', () => {
    const before = base();
    const after = laps(before, [['p1', 72000, 10]]);
    const result = outcome(before, after);
    expect(result).toMatchObject({
      position: 3,
      previousPosition: 3,
      total: 3,
      personalBest: true,
      overtaken: [],
      trackRecord: false,
      gapToAboveMs: 1000,
    });
    expect(result.above?.profile.name).toBe('Luli');
    expect(getCelebration([result])).toBe('personalBest');
  });

  it('superar a otro jugador', () => {
    const before = base();
    const after = laps(before, [['p1', 70500, 10]]);
    const result = outcome(before, after);
    expect(result.position).toBe(2);
    expect(result.overtaken.map((profile) => profile.name)).toEqual(['Luli']);
    expect(result.above?.profile.name).toBe('Tomi');
    expect(result.gapToAboveMs).toBe(500);
    expect(getCelebration([result])).toBe('overtake');
  });

  it('récord de la pista: queda primero y supera a todos', () => {
    const before = base();
    const after = laps(before, [['p1', 69000, 10]]);
    const result = outcome(before, after);
    expect(result).toMatchObject({
      position: 1,
      trackRecord: true,
      above: null,
      gapToAboveMs: null,
    });
    expect(result.overtaken.map((profile) => profile.name)).toEqual(['Tomi', 'Luli']);
    expect(getCelebration([result])).toBe('trackRecord');
  });

  it('mejorar el propio récord de la pista también es récord de la pista', () => {
    const before = base();
    const after = laps(before, [['p2', 69000, 10]]);
    expect(outcome(before, after, 'p2')).toMatchObject({ trackRecord: true, overtaken: [] });
  });

  it('solo en la tabla, el primer tiempo es mejor personal, no récord de la pista', () => {
    const before = players();
    const after = laps(before, [['p1', 72000, 1]]);
    const result = outcome(before, after);
    expect(result).toMatchObject({ position: 1, previousPosition: null, trackRecord: false });
    expect(getCelebration([result])).toBe('personalBest');
  });

  it('al entrar en la tabla, supera a los que quedaron detrás', () => {
    const before = laps(players(), [
      ['p2', 70000, 1],
      ['p3', 75000, 2],
    ]);
    const after = laps(before, [['p1', 72000, 10]]);
    const result = outcome(before, after);
    expect(result.previousPosition).toBeNull();
    expect(result.overtaken.map((profile) => profile.name)).toEqual(['Luli']);
  });

  it('sin mejorar, no hay celebración y sigue en su puesto', () => {
    const before = base();
    const after = laps(before, [['p1', 80000, 10]]);
    const result = outcome(before, after);
    expect(result).toMatchObject({ position: 3, personalBest: false, overtaken: [] });
    expect(getCelebration([result])).toBeNull();
  });

  it('sin tiempo en la tabla, no tiene puesto', () => {
    const before = base();
    const result = getRankingOutcome(before, before, 'p1', LAGO, raceTable(3));
    expect(result).toMatchObject({ position: null, total: 0, personalBest: false });
  });

  it('la celebración es la más grande de las dos tablas', () => {
    const before = races(base(), [
      ['p2', 3, 190000, 1],
      ['p1', 3, 200000, 2],
    ]);
    const after = races(laps(before, [['p1', 72000, 10]]), [['p1', 3, 185000, 10]]);
    const lap = outcome(before, after);
    const race = getRankingOutcome(before, after, 'p1', LAGO, raceTable(3));
    expect(lap.personalBest).toBe(true);
    expect(race.trackRecord).toBe(true);
    expect(getCelebration([lap, race])).toBe('trackRecord');
    expect(getCelebration([])).toBeNull();
  });
});
