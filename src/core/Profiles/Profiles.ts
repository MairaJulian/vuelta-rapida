import { CAR_COLORS, DEFAULT_CAR_COLOR_ID, isCarColorId } from '@/core/CarPalette';
import { serializeSaveDocument } from '@/core/SaveData';

import type {
  LapRecord,
  Profile,
  ProfileDraft,
  ProfileError,
  ProfileResult,
  ProfilesState,
  RaceRecord,
} from './Profiles.types';

/** Largo máximo del nombre, en caracteres. */
export const MAX_NAME_LENGTH = 12;
export const MIN_CAR_NUMBER = 1;
export const MAX_CAR_NUMBER = 99;

/**
 * Números que se sugieren a un perfil nuevo, en orden: los de las escuderías
 * inventadas del handoff (Cóndor 7, Pampa Racing 14, Andes GP 3, Tormenta 21) y el 27
 * de la personalización.
 */
const SUGGESTED_NUMBERS = [7, 14, 3, 21, 27];

/** Nombre de un perfil guardado sin nombre válido (dato roto). */
const FALLBACK_NAME = 'Piloto';

/** Sin perfiles ni récords: una instalación nueva. */
export const EMPTY_PROFILES_STATE: ProfilesState = Object.freeze({
  profiles: [],
  activeProfileId: null,
  lapRecords: [],
  raceRecords: [],
  unassignedRecords: Object.freeze({}),
});

/** Nombre sin espacios sobrantes: sin espacios al principio ni al final, y de a uno en el medio. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Largo en caracteres (un emoji cuenta como uno, no como dos unidades de UTF-16). */
export function nameLength(name: string): number {
  return [...name].length;
}

/**
 * Clave para comparar nombres: en mayúsculas (se muestran así) y sin acentos, para que
 * "Jose" y "JOSÉ" no convivan. La tilde de la ñ se conserva: "Peña" y "Pena" son
 * nombres distintos.
 */
export function nameKey(name: string): string {
  return normalizeName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u0302\u0304-\u036f]/g, '')
    .normalize('NFC')
    .toUpperCase();
}

const isCarNumber = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_CAR_NUMBER &&
  value <= MAX_CAR_NUMBER;

const isLapTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Por qué no se puede guardar un perfil; vacío si está todo bien. El nombre se valida
 * ya normalizado. `editingId` es el perfil que se edita: su propio nombre no choca.
 */
export function validateProfile(
  draft: ProfileDraft,
  profiles: readonly Profile[],
  editingId: string | null = null,
): ProfileError[] {
  const errors: ProfileError[] = [];
  const name = normalizeName(draft.name);
  if (name.length === 0) {
    errors.push('name-empty');
  } else if (nameLength(name) > MAX_NAME_LENGTH) {
    errors.push('name-too-long');
  } else if (
    profiles.some((profile) => profile.id !== editingId && nameKey(profile.name) === nameKey(name))
  ) {
    errors.push('name-taken');
  }
  if (!isCarNumber(draft.number)) {
    errors.push('number-out-of-range');
  }
  if (!isCarColorId(draft.colorId)) {
    errors.push('color-unknown');
  }
  return errors;
}

/** Número siguiente o anterior del selector: da la vuelta en los extremos (99 → 1, 1 → 99). */
export function stepCarNumber(number: number, delta: number): number {
  const span = MAX_CAR_NUMBER - MIN_CAR_NUMBER + 1;
  const offset = (((Math.round(number) - MIN_CAR_NUMBER + delta) % span) + span) % span;
  return MIN_CAR_NUMBER + offset;
}

/**
 * Identificador nuevo a partir de la fecha y un número al azar (de 0 a 1), distinto de
 * los que ya existen. Los dos llegan como parámetros, así esto sigue siendo puro.
 */
export function createProfileId(now: number, random: number, takenIds: readonly string[]): string {
  const suffix = Math.floor(Math.min(Math.max(random, 0), 0.999999) * 36 ** 4)
    .toString(36)
    .padStart(4, '0');
  const base = `p-${Math.max(0, Math.floor(now)).toString(36)}-${suffix}`;
  let id = base;
  for (let n = 2; takenIds.includes(id); n += 1) {
    id = `${base}-${n}`;
  }
  return id;
}

/**
 * Valores iniciales de un perfil nuevo: sin nombre, el primer color que nadie usa y un
 * número libre (primero los sugeridos y después el más chico). Si todo está usado,
 * repite: color y número pueden repetirse entre perfiles.
 */
export function suggestProfileDraft(profiles: readonly Profile[]): ProfileDraft {
  const usedColors = new Set(profiles.map((profile) => profile.colorId));
  const usedNumbers = new Set(profiles.map((profile) => profile.number));
  const color = CAR_COLORS.find((candidate) => !usedColors.has(candidate.id));
  const allNumbers = Array.from(
    { length: MAX_CAR_NUMBER - MIN_CAR_NUMBER + 1 },
    (_, i) => MIN_CAR_NUMBER + i,
  );
  const number = [...SUGGESTED_NUMBERS, ...allNumbers].find(
    (candidate) => !usedNumbers.has(candidate),
  );
  return {
    name: '',
    colorId: color?.id ?? DEFAULT_CAR_COLOR_ID,
    number: number ?? SUGGESTED_NUMBERS[0],
  };
}

export function getProfile(state: ProfilesState, id: string | null): Profile | null {
  return state.profiles.find((profile) => profile.id === id) ?? null;
}

/** El perfil que está jugando, o `null`. */
export function getActiveProfile(state: ProfilesState): Profile | null {
  return getProfile(state, state.activeProfileId);
}

/**
 * Crea un perfil y lo deja activo. `id` tiene que ser nuevo (`createProfileId`). Si
 * hay récords sin dueño (los de antes de los perfiles), pasan a este perfil.
 */
export function createProfile(
  state: ProfilesState,
  draft: ProfileDraft,
  { id, now }: { id: string; now: number },
): ProfileResult {
  const errors = validateProfile(draft, state.profiles);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  const profile: Profile = {
    id,
    name: normalizeName(draft.name),
    colorId: draft.colorId,
    number: draft.number,
    createdAt: now,
  };
  const inherited: LapRecord[] = Object.entries(state.unassignedRecords).map(
    ([circuitId, lapMs]) => ({ profileId: id, circuitId, lapMs, setAt: now }),
  );
  return {
    ok: true,
    profile,
    state: {
      ...state,
      profiles: [...state.profiles, profile],
      activeProfileId: id,
      lapRecords: [...state.lapRecords, ...inherited],
      unassignedRecords: inherited.length > 0 ? {} : state.unassignedRecords,
    },
  };
}

/** Cambia nombre, color y número de un perfil. El id, la fecha y los récords no cambian. */
export function updateProfile(
  state: ProfilesState,
  id: string,
  draft: ProfileDraft,
): ProfileResult {
  const current = getProfile(state, id);
  if (!current) {
    return { ok: false, errors: ['profile-missing'] };
  }
  const errors = validateProfile(draft, state.profiles, id);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  const profile: Profile = {
    ...current,
    name: normalizeName(draft.name),
    colorId: draft.colorId,
    number: draft.number,
  };
  return {
    ok: true,
    profile,
    state: {
      ...state,
      profiles: state.profiles.map((item) => (item.id === id ? profile : item)),
    },
  };
}

/**
 * Borra un perfil y sus récords (de vuelta y de carrera): sale de todas las tablas del
 * ranking. Si era el activo, no queda nadie jugando.
 */
export function deleteProfile(state: ProfilesState, id: string): ProfilesState {
  if (!getProfile(state, id)) {
    return state;
  }
  return {
    ...state,
    profiles: state.profiles.filter((profile) => profile.id !== id),
    activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
    lapRecords: state.lapRecords.filter((record) => record.profileId !== id),
    raceRecords: state.raceRecords.filter((record) => record.profileId !== id),
  };
}

/** Elige quién juega. Un id que no existe no cambia nada. */
export function selectProfile(state: ProfilesState, id: string): ProfilesState {
  if (!getProfile(state, id) || state.activeProfileId === id) {
    return state;
  }
  return { ...state, activeProfileId: id };
}

/** Mejor vuelta de un perfil en un circuito; sin perfil, la de los récords sin dueño. */
export function getBestLap(
  state: ProfilesState,
  profileId: string | null,
  circuitId: string,
): number | null {
  if (profileId === null) {
    return state.unassignedRecords[circuitId] ?? null;
  }
  const record = state.lapRecords.find(
    (item) => item.profileId === profileId && item.circuitId === circuitId,
  );
  return record?.lapMs ?? null;
}

/** Mejor carrera completa de un perfil en un circuito con esas vueltas, o `null`. */
export function getBestRace(
  state: ProfilesState,
  profileId: string | null,
  circuitId: string,
  laps: number,
): number | null {
  const record = state.raceRecords.find(
    (item) => item.profileId === profileId && item.circuitId === circuitId && item.laps === laps,
  );
  return record?.totalMs ?? null;
}

/**
 * Estado con una vuelta nueva: si `lapMs` mejora la mejor vuelta del perfil en el
 * circuito (o es la primera), la guarda; si no, devuelve `null` (nada que guardar).
 * Sin perfil (o con uno que no existe), la vuelta queda sin dueño.
 */
export function withLapRecord(
  state: ProfilesState,
  profileId: string | null,
  circuitId: string,
  lapMs: number,
  now: number,
): ProfilesState | null {
  const owner = getProfile(state, profileId)?.id ?? null;
  const current = getBestLap(state, owner, circuitId);
  if (!isLapTime(lapMs) || (current !== null && current <= lapMs)) {
    return null;
  }
  if (owner === null) {
    return { ...state, unassignedRecords: { ...state.unassignedRecords, [circuitId]: lapMs } };
  }
  const record: LapRecord = { profileId: owner, circuitId, lapMs, setAt: now };
  return {
    ...state,
    lapRecords: [
      ...state.lapRecords.filter(
        (item) => !(item.profileId === owner && item.circuitId === circuitId),
      ),
      record,
    ],
  };
}

const isLapCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

/**
 * Estado con una carrera completa nueva: si `totalMs` mejora la mejor carrera del
 * perfil en el circuito con esas vueltas (o es la primera), la guarda; si no, `null`.
 * Con el mismo tiempo no se reemplaza: en el ranking gana quien lo logró primero. Sin
 * perfil (o con uno que no existe) no se guarda: no hay a quién ponerle el tiempo.
 */
export function withRaceRecord(
  state: ProfilesState,
  profileId: string | null,
  circuitId: string,
  laps: number,
  totalMs: number,
  now: number,
): ProfilesState | null {
  const owner = getProfile(state, profileId)?.id ?? null;
  if (owner === null || !isLapCount(laps) || !isLapTime(totalMs)) {
    return null;
  }
  const current = getBestRace(state, owner, circuitId, laps);
  if (current !== null && current <= totalMs) {
    return null;
  }
  const record: RaceRecord = { profileId: owner, circuitId, laps, totalMs, setAt: now };
  const isSame = (item: RaceRecord) =>
    item.profileId === owner && item.circuitId === circuitId && item.laps === laps;
  return {
    ...state,
    raceRecords: [...state.raceRecords.filter((item) => !isSame(item)), record],
  };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const finiteOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Perfil guardado: sin id válido (o repetido) se descarta; cada otro campo inválido se corrige. */
function parseProfile(value: unknown, takenIds: Set<string>): Profile | null {
  if (
    !isObject(value) ||
    typeof value.id !== 'string' ||
    value.id === '' ||
    takenIds.has(value.id)
  ) {
    return null;
  }
  const name = typeof value.name === 'string' ? normalizeName(value.name) : '';
  return {
    id: value.id,
    name: name === '' ? FALLBACK_NAME : [...name].slice(0, MAX_NAME_LENGTH).join(''),
    colorId: isCarColorId(value.colorId) ? value.colorId : DEFAULT_CAR_COLOR_ID,
    number: isCarNumber(value.number) ? value.number : SUGGESTED_NUMBERS[0],
    createdAt: finiteOr(value.createdAt, 0),
  };
}

/**
 * Récords guardados de un tipo: de perfiles que existen y con datos válidos (`read`
 * devuelve `null` si no sirven). Queda uno por clave (`keyOf`), el más rápido.
 */
function parseBest<Entry extends { profileId: string; setAt: number }>(
  value: unknown,
  profileIds: Set<string>,
  read: (item: Record<string, unknown>, profileId: string) => Entry | null,
  keyOf: (entry: Entry) => string,
  timeOf: (entry: Entry) => number,
): Entry[] {
  const best = new Map<string, Entry>();
  for (const item of Array.isArray(value) ? value : []) {
    if (isObject(item) && typeof item.profileId === 'string' && profileIds.has(item.profileId)) {
      const entry = read(item, item.profileId);
      const current = entry && best.get(keyOf(entry));
      if (entry && (!current || timeOf(entry) < timeOf(current))) {
        best.set(keyOf(entry), entry);
      }
    }
  }
  return [...best.values()];
}

const parseLapRecords = (value: unknown, profileIds: Set<string>) =>
  parseBest<LapRecord>(
    value,
    profileIds,
    (item, profileId) =>
      typeof item.circuitId === 'string' && isLapTime(item.lapMs)
        ? {
            profileId,
            circuitId: item.circuitId,
            lapMs: item.lapMs,
            setAt: finiteOr(item.setAt, 0),
          }
        : null,
    (entry) => JSON.stringify([entry.profileId, entry.circuitId]),
    (entry) => entry.lapMs,
  );

const parseRaceRecords = (value: unknown, profileIds: Set<string>) =>
  parseBest<RaceRecord>(
    value,
    profileIds,
    (item, profileId) =>
      typeof item.circuitId === 'string' && isLapCount(item.laps) && isLapTime(item.totalMs)
        ? {
            profileId,
            circuitId: item.circuitId,
            laps: item.laps,
            totalMs: item.totalMs,
            setAt: finiteOr(item.setAt, 0),
          }
        : null,
    (entry) => JSON.stringify([entry.profileId, entry.circuitId, entry.laps]),
    (entry) => entry.totalMs,
  );

/**
 * Lee el documento de perfiles ya migrado (`core/SaveData`). Tolera texto vacío, JSON
 * roto y datos inválidos: descarta lo que no sirve y conserva el resto, así un dato
 * corrupto nunca deja el juego sin arrancar.
 */
export function parseProfilesState(raw: string | null): ProfilesState {
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!isObject(data)) {
    return {
      ...EMPTY_PROFILES_STATE,
      profiles: [],
      lapRecords: [],
      raceRecords: [],
      unassignedRecords: {},
    };
  }
  const ids = new Set<string>();
  const profiles: Profile[] = [];
  for (const item of Array.isArray(data.profiles) ? data.profiles : []) {
    const profile = parseProfile(item, ids);
    if (profile) {
      ids.add(profile.id);
      profiles.push(profile);
    }
  }
  const unassignedRecords: Record<string, number> = {};
  if (isObject(data.unassignedRecords)) {
    for (const [circuitId, ms] of Object.entries(data.unassignedRecords)) {
      if (isLapTime(ms)) {
        unassignedRecords[circuitId] = ms;
      }
    }
  }
  const active = data.activeProfileId;
  return {
    profiles,
    activeProfileId: typeof active === 'string' && ids.has(active) ? active : null,
    lapRecords: parseLapRecords(data.lapRecords, ids),
    raceRecords: parseRaceRecords(data.raceRecords, ids),
    unassignedRecords,
  };
}

/** Texto para guardar, con el número de versión y solo los campos conocidos. */
export function serializeProfilesState(state: ProfilesState): string {
  return serializeSaveDocument({
    profiles: state.profiles.map(({ id, name, colorId, number, createdAt }) => ({
      id,
      name,
      colorId,
      number,
      createdAt,
    })),
    activeProfileId: state.activeProfileId,
    lapRecords: state.lapRecords.map(({ profileId, circuitId, lapMs, setAt }) => ({
      profileId,
      circuitId,
      lapMs,
      setAt,
    })),
    raceRecords: state.raceRecords.map(({ profileId, circuitId, laps, totalMs, setAt }) => ({
      profileId,
      circuitId,
      laps,
      totalMs,
      setAt,
    })),
    unassignedRecords: state.unassignedRecords,
  });
}
