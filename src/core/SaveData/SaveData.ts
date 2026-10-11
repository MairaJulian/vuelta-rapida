import type {
  RawSave,
  SaveDocument,
  SaveDocumentName,
  SaveDocuments,
  SaveMigration,
  SaveMigrationResult,
  SaveWrite,
} from './SaveData.types';

/** Versión actual de los datos guardados. Subirla exige sumar un paso a `SAVE_MIGRATIONS`. */
export const SAVE_VERSION = 4;

/** Versión de los datos guardados antes de que existiera el número de versión (hito 6a). */
export const LEGACY_SAVE_VERSION = 1;

/**
 * Documentos guardados, en el orden en que se escriben al migrar: primero los
 * perfiles (reciben datos) y después las preferencias (los pierden). Si la escritura
 * se corta en el medio, no se pierde nada.
 */
export const SAVE_DOCUMENTS: readonly SaveDocumentName[] = ['profiles', 'preferences'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lee un documento: `null` si no existe, si el JSON está roto o si no es un objeto. */
export function parseSaveDocument(raw: string | null): SaveDocument {
  if (!raw) {
    return null;
  }
  try {
    const data: unknown = JSON.parse(raw);
    return isObject(data) ? data : null;
  } catch {
    return null;
  }
}

/** Versión de un documento: sin número (o con uno inválido), es de antes del versionado. */
export function getDocumentVersion(document: Record<string, unknown>): number {
  const { version } = document;
  return typeof version === 'number' && Number.isInteger(version) && version >= 1
    ? version
    : LEGACY_SAVE_VERSION;
}

/** Texto para guardar un documento en la versión actual: el número de versión va primero. */
export function serializeSaveDocument(fields: Record<string, unknown>, version = SAVE_VERSION) {
  const rest = { ...fields };
  delete rest.version;
  return JSON.stringify({ version, ...rest });
}

/** Solo los tiempos positivos y finitos, por clave de texto. */
function validLapTimes(value: unknown): Record<string, number> {
  const times: Record<string, number> = {};
  if (isObject(value)) {
    for (const [circuitId, ms] of Object.entries(value)) {
      if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
        times[circuitId] = ms;
      }
    }
  }
  return times;
}

/**
 * v1 → v2 (hito 6a, perfiles): los récords dejan las preferencias (`bestLapsMs`) y
 * pasan al documento nuevo de perfiles, sin dueño (`unassignedRecords`) hasta que se
 * cree el primer perfil. Si el documento de perfiles ya existe, una migración anterior
 * se cortó después de crearlo: los récords ya están ahí y solo falta limpiar las
 * preferencias.
 */
function moveRecordsToProfiles({ profiles, preferences }: SaveDocuments): SaveDocuments {
  if (preferences === null) {
    return { profiles, preferences };
  }
  const { bestLapsMs, ...rest } = preferences;
  return {
    profiles: profiles ?? {
      profiles: [],
      activeProfileId: null,
      records: [],
      unassignedRecords: validLapTimes(bestLapsMs),
    },
    preferences: rest,
  };
}

/**
 * v2 → v3 (hito 6b, ranking): las mejores vueltas (`records`) pasan a llamarse
 * `lapRecords`, y se suman las mejores carreras completas (`raceRecords`), que antes no
 * se guardaban. Si el documento ya tiene `lapRecords`, una migración anterior se cortó
 * después de escribirlo: se deja como está.
 */
function addRaceRecords({ profiles, preferences }: SaveDocuments): SaveDocuments {
  if (profiles === null) {
    return { profiles, preferences };
  }
  const { records, ...rest } = profiles;
  return {
    profiles: {
      ...rest,
      lapRecords: rest.lapRecords ?? (Array.isArray(records) ? records : []),
      raceRecords: rest.raceRecords ?? [],
    },
    preferences,
  };
}

/**
 * v3 → v4 (hito 8, fantasma): los perfiles suman la lista de fantasmas (`ghosts`, vacía:
 * hasta ahora no se grababa nada) y las preferencias, qué fantasma corre (`ghostSource`,
 * el de la mejor vuelta del jugador). Si el documento ya tiene el campo, una migración
 * anterior se cortó después de escribirlo: se deja como está.
 */
function addGhosts({ profiles, preferences }: SaveDocuments): SaveDocuments {
  return {
    profiles: profiles === null ? null : { ...profiles, ghosts: profiles.ghosts ?? [] },
    preferences:
      preferences === null
        ? null
        : { ...preferences, ghostSource: preferences.ghostSource ?? 'mine' },
  };
}

/** Pasos de migración, uno por versión. */
export const SAVE_MIGRATIONS: readonly SaveMigration[] = Object.freeze([
  { from: 1, to: 2, migrate: moveRecordsToProfiles },
  { from: 2, to: 3, migrate: addRaceRecords },
  { from: 3, to: 4, migrate: addGhosts },
]);

/**
 * Lleva los datos guardados a la versión actual. Recibe el texto crudo de cada
 * documento y devuelve los documentos migrados y lo que hay que escribir, en orden.
 *
 * - Sin nada guardado (instalación nueva) no hay nada que migrar.
 * - La versión de partida es la del documento más viejo.
 * - Con datos de una versión más nueva que la app, o si falta un paso, no toca nada:
 *   mejor leer lo que se entienda que reescribir y perder datos.
 * - Es pura: la escritura la hace quien la llama (`storage/SaveStore`).
 */
export function migrateSave(
  raw: RawSave,
  migrations: readonly SaveMigration[] = SAVE_MIGRATIONS,
  targetVersion = SAVE_VERSION,
): SaveMigrationResult {
  let documents: SaveDocuments = {
    profiles: parseSaveDocument(raw.profiles),
    preferences: parseSaveDocument(raw.preferences),
  };
  const present = SAVE_DOCUMENTS.map((name) => documents[name]).filter(
    (document): document is Record<string, unknown> => document !== null,
  );
  if (present.length === 0) {
    return { fromVersion: null, documents: { ...raw }, writes: [] };
  }
  const fromVersion = Math.min(...present.map(getDocumentVersion));
  const unchanged = { fromVersion, documents: { ...raw }, writes: [] };
  if (fromVersion >= targetVersion) {
    return unchanged;
  }

  for (let version = fromVersion; version < targetVersion;) {
    const step = migrations.find((migration) => migration.from === version);
    if (!step || step.to <= version) {
      return unchanged;
    }
    documents = step.migrate(documents);
    version = step.to;
  }

  const result: RawSave = { ...raw };
  const writes: SaveWrite[] = [];
  for (const name of SAVE_DOCUMENTS) {
    const document = documents[name];
    if (document !== null) {
      const json = serializeSaveDocument(document, targetVersion);
      if (json !== raw[name]) {
        writes.push({ document: name, json });
        result[name] = json;
      }
    }
  }
  return { fromVersion, documents: result, writes };
}
