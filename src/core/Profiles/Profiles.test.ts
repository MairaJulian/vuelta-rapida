import { CAR_COLORS } from '@/core/CarPalette';
import { SAVE_VERSION } from '@/core/SaveData';

import {
  createProfile,
  createProfileId,
  deleteProfile,
  EMPTY_PROFILES_STATE,
  getActiveProfile,
  getBestLap,
  MAX_NAME_LENGTH,
  nameKey,
  nameLength,
  normalizeName,
  parseProfilesState,
  selectProfile,
  serializeProfilesState,
  stepCarNumber,
  suggestProfileDraft,
  updateProfile,
  validateProfile,
  withLapRecord,
} from './Profiles';
import type { Profile, ProfileDraft, ProfilesState } from './Profiles.types';

const LAGO = 'autodromo-del-lago';
const NOW = Date.UTC(2026, 9, 10);

const draft = (changes: Partial<ProfileDraft> = {}): ProfileDraft => ({
  name: 'Male',
  colorId: 'blue',
  number: 27,
  ...changes,
});

/** Crea un perfil y devuelve el estado; falla el test si no se pudo. */
function create(state: ProfilesState, id: string, changes: Partial<ProfileDraft> = {}) {
  const result = createProfile(state, draft(changes), { id, now: NOW });
  if (!result.ok) {
    throw new Error(`no se pudo crear ${id}: ${result.errors.join(', ')}`);
  }
  return result.state;
}

const twoPlayers = () =>
  create(create(EMPTY_PROFILES_STATE, 'p1', { name: 'Male' }), 'p2', {
    name: 'Tomi',
    colorId: 'coral',
    number: 7,
  });

describe('normalizeName', () => {
  it('saca los espacios del principio y del final, y deja uno solo en el medio', () => {
    expect(normalizeName('  Male  ')).toBe('Male');
    expect(normalizeName('Juan   Cruz')).toBe('Juan Cruz');
    expect(normalizeName('\tAna\n')).toBe('Ana');
    expect(normalizeName('   ')).toBe('');
  });
});

describe('nameLength', () => {
  it('cuenta caracteres, no unidades de UTF-16', () => {
    expect(nameLength('Male')).toBe(4);
    expect(nameLength('🏎️')).toBe(2); // auto + selector de variante
    expect(nameLength('🚗')).toBe(1);
  });
});

describe('nameKey', () => {
  it('no distingue mayúsculas, acentos ni espacios sobrantes', () => {
    expect(nameKey('José')).toBe(nameKey('JOSE'));
    expect(nameKey(' tomi ')).toBe(nameKey('TOMI'));
    expect(nameKey('Agüero')).toBe(nameKey('AGUERO'));
  });

  it('la ñ no es una n', () => {
    expect(nameKey('Peña')).not.toBe(nameKey('Pena'));
    expect(nameKey('peña')).toBe(nameKey('PEÑA'));
  });
});

describe('validateProfile', () => {
  const profiles: Profile[] = [
    { id: 'p1', name: 'Male', colorId: 'blue', number: 27, createdAt: NOW },
  ];

  it('acepta un perfil completo', () => {
    expect(validateProfile(draft({ name: 'Tomi' }), profiles)).toEqual([]);
  });

  it('el nombre es obligatorio', () => {
    expect(validateProfile(draft({ name: '' }), [])).toEqual(['name-empty']);
    expect(validateProfile(draft({ name: '    ' }), [])).toEqual(['name-empty']);
  });

  it('el nombre tiene hasta 12 caracteres, sin contar los espacios sobrantes', () => {
    expect(MAX_NAME_LENGTH).toBe(12);
    expect(validateProfile(draft({ name: 'Maximiliano1' }), [])).toEqual([]);
    expect(validateProfile(draft({ name: 'Maximiliano12' }), [])).toEqual(['name-too-long']);
    expect(validateProfile(draft({ name: '   Maximiliano1   ' }), [])).toEqual([]);
  });

  it('el nombre no se repite entre perfiles, sin importar mayúsculas ni acentos', () => {
    expect(validateProfile(draft({ name: 'Male' }), profiles)).toEqual(['name-taken']);
    expect(validateProfile(draft({ name: ' MALE ' }), profiles)).toEqual(['name-taken']);
    expect(validateProfile(draft({ name: 'Malé' }), profiles)).toEqual(['name-taken']);
  });

  it('al editar, el nombre propio no choca', () => {
    expect(validateProfile(draft({ name: 'MALE' }), profiles, 'p1')).toEqual([]);
  });

  it('el número va de 1 a 99 y es entero', () => {
    expect(validateProfile(draft({ number: 1 }), [])).toEqual([]);
    expect(validateProfile(draft({ number: 99 }), [])).toEqual([]);
    [0, 100, -5, 7.5, Number.NaN].forEach((number) =>
      expect(validateProfile(draft({ number }), [])).toEqual(['number-out-of-range']),
    );
  });

  it('el color tiene que ser de la paleta', () => {
    expect(validateProfile(draft({ colorId: 'ink' as never }), [])).toEqual(['color-unknown']);
  });

  it('junta todos los errores', () => {
    expect(validateProfile({ name: '', colorId: 'ink' as never, number: 0 }, [])).toEqual([
      'name-empty',
      'number-out-of-range',
      'color-unknown',
    ]);
  });

  it('número y color pueden repetirse entre perfiles', () => {
    expect(validateProfile(draft({ name: 'Tomi', colorId: 'blue', number: 27 }), profiles)).toEqual(
      [],
    );
  });
});

describe('stepCarNumber', () => {
  it('suma y resta de a uno', () => {
    expect(stepCarNumber(27, 1)).toBe(28);
    expect(stepCarNumber(27, -1)).toBe(26);
  });

  it('da la vuelta en los extremos', () => {
    expect(stepCarNumber(99, 1)).toBe(1);
    expect(stepCarNumber(1, -1)).toBe(99);
  });
});

describe('createProfileId', () => {
  it('arma un id con la fecha y el número al azar', () => {
    expect(createProfileId(NOW, 0.5, [])).toMatch(/^p-[0-9a-z]+-[0-9a-z]{4}$/);
    expect(createProfileId(NOW, 0.5, [])).not.toBe(createProfileId(NOW, 0.6, []));
  });

  it('nunca repite un id existente', () => {
    const first = createProfileId(NOW, 0.5, []);
    const second = createProfileId(NOW, 0.5, [first]);
    expect(second).not.toBe(first);
    expect(createProfileId(NOW, 0.5, [first, second])).not.toBe(second);
  });

  it('tolera valores fuera de rango', () => {
    expect(createProfileId(NOW, 1, [])).toMatch(/^p-[0-9a-z]+-[0-9a-z]{4}$/);
    expect(createProfileId(-1, -1, [])).toBe('p-0-0000');
  });
});

describe('suggestProfileDraft', () => {
  it('el primero arranca sin nombre, azul y con el 7', () => {
    expect(suggestProfileDraft([])).toEqual({ name: '', colorId: 'blue', number: 7 });
  });

  it('elige un color y un número que nadie usa', () => {
    const state = twoPlayers(); // azul 27 y coral 7
    expect(suggestProfileDraft(state.profiles)).toEqual({
      name: '',
      colorId: 'lime',
      number: 14,
    });
  });

  it('con todos los sugeridos usados, el número libre más chico', () => {
    const profiles = [7, 14, 3, 21, 27, 1].map((number, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      colorId: 'blue' as const,
      number,
      createdAt: NOW,
    }));
    expect(suggestProfileDraft(profiles).number).toBe(2);
  });

  it('con todos los colores usados, repite', () => {
    const profiles = CAR_COLORS.map((color, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      colorId: color.id,
      number: i + 1,
      createdAt: NOW,
    }));
    expect(suggestProfileDraft(profiles).colorId).toBe('blue');
  });
});

describe('createProfile', () => {
  it('crea el perfil normalizado, con su fecha, y lo deja activo', () => {
    const result = createProfile(EMPTY_PROFILES_STATE, draft({ name: '  Juan   Cruz ' }), {
      id: 'p1',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile).toEqual({
      id: 'p1',
      name: 'Juan Cruz',
      colorId: 'blue',
      number: 27,
      createdAt: NOW,
    });
    expect(result.state.profiles).toEqual([result.profile]);
    expect(result.state.activeProfileId).toBe('p1');
  });

  it('con datos inválidos no cambia nada y devuelve los errores', () => {
    const state = twoPlayers();
    const result = createProfile(state, draft({ name: 'tomi', number: 100 }), {
      id: 'p3',
      now: NOW,
    });
    expect(result).toEqual({ ok: false, errors: ['name-taken', 'number-out-of-range'] });
  });

  it('el primer perfil se queda con los récords sin dueño', () => {
    const before: ProfilesState = {
      ...EMPTY_PROFILES_STATE,
      unassignedRecords: { [LAGO]: 72480, puerto: 80000 },
    };
    const state = create(before, 'p1');
    expect(state.unassignedRecords).toEqual({});
    expect(state.records).toEqual([
      { profileId: 'p1', circuitId: LAGO, lapMs: 72480, setAt: NOW },
      { profileId: 'p1', circuitId: 'puerto', lapMs: 80000, setAt: NOW },
    ]);
    expect(getBestLap(state, 'p1', LAGO)).toBe(72480);
  });

  it('el segundo perfil arranca sin récords', () => {
    const before: ProfilesState = { ...EMPTY_PROFILES_STATE, unassignedRecords: { [LAGO]: 72480 } };
    const state = create(create(before, 'p1'), 'p2', { name: 'Tomi' });
    expect(getBestLap(state, 'p1', LAGO)).toBe(72480);
    expect(getBestLap(state, 'p2', LAGO)).toBeNull();
  });

  it('no modifica el estado que recibe', () => {
    const before: ProfilesState = { ...EMPTY_PROFILES_STATE, profiles: [], records: [] };
    Object.freeze(before.profiles);
    Object.freeze(before.records);
    create(before, 'p1');
    expect(before.profiles).toEqual([]);
  });
});

describe('updateProfile', () => {
  it('cambia nombre, color y número; conserva id, fecha y récords', () => {
    const base = withLapRecord(twoPlayers(), 'p1', LAGO, 70000, NOW + 1)!;
    const result = updateProfile(base, 'p1', { name: ' Maca ', colorId: 'pink', number: 99 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile).toEqual({
      id: 'p1',
      name: 'Maca',
      colorId: 'pink',
      number: 99,
      createdAt: NOW,
    });
    expect(result.state.profiles.map((profile) => profile.name)).toEqual(['Maca', 'Tomi']);
    expect(getBestLap(result.state, 'p1', LAGO)).toBe(70000);
  });

  it('puede dejar el mismo nombre con otras mayúsculas', () => {
    const result = updateProfile(twoPlayers(), 'p1', draft({ name: 'MALE' }));
    expect(result.ok).toBe(true);
  });

  it('no puede tomar el nombre de otro perfil', () => {
    expect(updateProfile(twoPlayers(), 'p1', draft({ name: 'Tomi' }))).toEqual({
      ok: false,
      errors: ['name-taken'],
    });
  });

  it('un perfil que no existe da error', () => {
    expect(updateProfile(twoPlayers(), 'p9', draft())).toEqual({
      ok: false,
      errors: ['profile-missing'],
    });
  });
});

describe('deleteProfile', () => {
  it('borra el perfil y sus récords, y deja los de los demás', () => {
    let state = twoPlayers();
    state = withLapRecord(state, 'p1', LAGO, 70000, NOW)!;
    state = withLapRecord(state, 'p2', LAGO, 71000, NOW)!;
    const next = deleteProfile(state, 'p1');
    expect(next.profiles.map((profile) => profile.id)).toEqual(['p2']);
    expect(next.records).toEqual([{ profileId: 'p2', circuitId: LAGO, lapMs: 71000, setAt: NOW }]);
  });

  it('si era el activo, no queda nadie jugando', () => {
    const state = twoPlayers(); // el activo es p2, el último creado
    expect(deleteProfile(state, 'p2').activeProfileId).toBeNull();
    expect(deleteProfile(state, 'p1').activeProfileId).toBe('p2');
  });

  it('un perfil que no existe no cambia nada', () => {
    const state = twoPlayers();
    expect(deleteProfile(state, 'p9')).toBe(state);
  });
});

describe('selectProfile y getActiveProfile', () => {
  it('elige quién juega', () => {
    const state = selectProfile(twoPlayers(), 'p1');
    expect(state.activeProfileId).toBe('p1');
    expect(getActiveProfile(state)?.name).toBe('Male');
  });

  it('un id que no existe no cambia nada', () => {
    const state = twoPlayers();
    expect(selectProfile(state, 'p9')).toBe(state);
  });

  it('sin perfil activo devuelve null', () => {
    expect(getActiveProfile(EMPTY_PROFILES_STATE)).toBeNull();
  });
});

describe('withLapRecord', () => {
  it('guarda la primera vuelta y solo reemplaza con una más rápida', () => {
    let state = twoPlayers();
    state = withLapRecord(state, 'p1', LAGO, 72000, NOW)!;
    expect(getBestLap(state, 'p1', LAGO)).toBe(72000);
    expect(withLapRecord(state, 'p1', LAGO, 72000, NOW)).toBeNull();
    expect(withLapRecord(state, 'p1', LAGO, 90000, NOW)).toBeNull();
    state = withLapRecord(state, 'p1', LAGO, 71000, NOW + 5)!;
    expect(state.records).toEqual([
      { profileId: 'p1', circuitId: LAGO, lapMs: 71000, setAt: NOW + 5 },
    ]);
  });

  it('cada perfil y cada circuito tienen su récord', () => {
    let state = twoPlayers();
    state = withLapRecord(state, 'p1', LAGO, 72000, NOW)!;
    state = withLapRecord(state, 'p2', LAGO, 75000, NOW)!;
    state = withLapRecord(state, 'p1', 'puerto', 80000, NOW)!;
    expect(getBestLap(state, 'p1', LAGO)).toBe(72000);
    expect(getBestLap(state, 'p2', LAGO)).toBe(75000);
    expect(getBestLap(state, 'p1', 'puerto')).toBe(80000);
    expect(getBestLap(state, 'p2', 'puerto')).toBeNull();
  });

  it('sin perfil, la vuelta queda sin dueño', () => {
    const state = withLapRecord(EMPTY_PROFILES_STATE, null, LAGO, 72000, NOW)!;
    expect(state.unassignedRecords).toEqual({ [LAGO]: 72000 });
    expect(getBestLap(state, null, LAGO)).toBe(72000);
    expect(withLapRecord(twoPlayers(), 'p9', LAGO, 72000, NOW)!.unassignedRecords).toEqual({
      [LAGO]: 72000,
    });
  });

  it('ignora tiempos inválidos', () => {
    expect(withLapRecord(twoPlayers(), 'p1', LAGO, 0, NOW)).toBeNull();
    expect(withLapRecord(twoPlayers(), 'p1', LAGO, Number.NaN, NOW)).toBeNull();
  });
});

describe('parseProfilesState y serializeProfilesState', () => {
  it('sin nada guardado, sin perfiles', () => {
    expect(parseProfilesState(null)).toEqual(EMPTY_PROFILES_STATE);
    expect(parseProfilesState('{roto')).toEqual(EMPTY_PROFILES_STATE);
    expect(parseProfilesState('[]')).toEqual(EMPTY_PROFILES_STATE);
  });

  it('lee lo que se guardó', () => {
    let state = twoPlayers();
    state = withLapRecord(state, 'p1', LAGO, 70000, NOW)!;
    state = { ...state, unassignedRecords: { puerto: 81000 } };
    expect(parseProfilesState(serializeProfilesState(state))).toEqual(state);
  });

  it('guarda el número de versión y solo los campos conocidos', () => {
    const state = twoPlayers();
    const withExtra = {
      ...state,
      extra: 1,
      profiles: state.profiles.map((profile) => ({ ...profile, apodo: 'x' })),
    };
    const saved = JSON.parse(serializeProfilesState(withExtra as ProfilesState));
    expect(saved.version).toBe(SAVE_VERSION);
    expect(saved.extra).toBeUndefined();
    expect(saved.profiles[0]).not.toHaveProperty('apodo');
    expect(Object.keys(saved)).toEqual([
      'version',
      'profiles',
      'activeProfileId',
      'records',
      'unassignedRecords',
    ]);
  });

  it('descarta perfiles sin id o con id repetido, y corrige los otros campos', () => {
    const parsed = parseProfilesState(
      JSON.stringify({
        profiles: [
          { id: 'p1', name: '  Male  ', colorId: 'ink', number: 500, createdAt: 'ayer' },
          { id: 'p1', name: 'Copia' },
          { name: 'Sin id' },
          { id: 'p2', name: '' },
          { id: 'p3', name: 'Nombre larguísimo' },
          'texto',
        ],
      }),
    );
    expect(parsed.profiles).toEqual([
      { id: 'p1', name: 'Male', colorId: 'blue', number: 7, createdAt: 0 },
      { id: 'p2', name: 'Piloto', colorId: 'blue', number: 7, createdAt: 0 },
      { id: 'p3', name: 'Nombre largu', colorId: 'blue', number: 7, createdAt: 0 },
    ]);
  });

  it('descarta récords inválidos o de perfiles que no existen, y deja el mejor de cada par', () => {
    const parsed = parseProfilesState(
      JSON.stringify({
        profiles: [{ id: 'p1', name: 'Male', colorId: 'blue', number: 27, createdAt: NOW }],
        records: [
          { profileId: 'p1', circuitId: LAGO, lapMs: 72000, setAt: NOW },
          { profileId: 'p1', circuitId: LAGO, lapMs: 71000 },
          { profileId: 'p9', circuitId: LAGO, lapMs: 60000, setAt: NOW },
          { profileId: 'p1', circuitId: 'puerto', lapMs: -1, setAt: NOW },
          { profileId: 'p1', lapMs: 70000 },
        ],
        unassignedRecords: { [LAGO]: 73000, roto: 0, texto: '1:10' },
        activeProfileId: 'p9',
      }),
    );
    expect(parsed.records).toEqual([{ profileId: 'p1', circuitId: LAGO, lapMs: 71000, setAt: 0 }]);
    expect(parsed.unassignedRecords).toEqual({ [LAGO]: 73000 });
    expect(parsed.activeProfileId).toBeNull();
  });

  it('devuelve un estado nuevo, no el vacío congelado', () => {
    const parsed = parseProfilesState(null);
    expect(parsed).not.toBe(EMPTY_PROFILES_STATE);
    expect(Object.isFrozen(parsed)).toBe(false);
    expect(Object.isFrozen(parsed.unassignedRecords)).toBe(false);
  });
});
