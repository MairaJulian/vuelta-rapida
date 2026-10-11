import {
  getDocumentVersion,
  migrateSave,
  parseSaveDocument,
  SAVE_DOCUMENTS,
  SAVE_MIGRATIONS,
  SAVE_VERSION,
  serializeSaveDocument,
} from './SaveData';
import type { RawSave, SaveMigration } from './SaveData.types';

const LAGO = 'autodromo-del-lago';

/** Preferencias como las guarda la versión de hoy (hito 5b): sin número de versión. */
const LEGACY_PREFERENCES = JSON.stringify({
  controlMode: 'buttons',
  tiltNeutralAngle: 0.12,
  tiltSensitivity: 7,
  tiltDeadZone: 0.05,
  bestLapsMs: { [LAGO]: 72480.5, puerto: 81000 },
  soundEnabled: false,
  vibrationEnabled: true,
});

const read = (json: string | null) => (json === null ? null : JSON.parse(json));

describe('parseSaveDocument', () => {
  it('lee un objeto JSON', () => {
    expect(parseSaveDocument('{"a":1}')).toEqual({ a: 1 });
  });

  it('sin documento, con JSON roto o con algo que no es un objeto, devuelve null', () => {
    [null, '', '{roto', '42', '[1,2]', 'null'].forEach((raw) =>
      expect(parseSaveDocument(raw)).toBeNull(),
    );
  });
});

describe('getDocumentVersion', () => {
  it('sin número de versión, es la versión 1 (antes del versionado)', () => {
    expect(getDocumentVersion({ controlMode: 'buttons' })).toBe(1);
    expect(getDocumentVersion({ version: 'dos' })).toBe(1);
    expect(getDocumentVersion({ version: 0 })).toBe(1);
    expect(getDocumentVersion({ version: 1.5 })).toBe(1);
  });

  it('lee el número guardado', () => {
    expect(getDocumentVersion({ version: 2 })).toBe(2);
    expect(getDocumentVersion({ version: 7 })).toBe(7);
  });
});

describe('serializeSaveDocument', () => {
  it('pone la versión actual primero y reemplaza la que hubiera', () => {
    expect(serializeSaveDocument({ a: 1, version: 1 })).toBe(`{"version":${SAVE_VERSION},"a":1}`);
    expect(serializeSaveDocument({ a: 1 }, 5)).toBe('{"version":5,"a":1}');
  });
});

describe('SAVE_MIGRATIONS', () => {
  it('hay un paso por versión, de la 1 a la actual, sin huecos', () => {
    expect(SAVE_MIGRATIONS.map((step) => [step.from, step.to])).toEqual(
      Array.from({ length: SAVE_VERSION - 1 }, (_, i) => [i + 1, i + 2]),
    );
  });

  it('los perfiles se escriben antes que las preferencias', () => {
    expect(SAVE_DOCUMENTS).toEqual(['profiles', 'preferences']);
  });
});

describe('migrateSave: de la versión 1 (sin perfiles) a la 2', () => {
  const toV2 = (raw: RawSave) => migrateSave(raw, SAVE_MIGRATIONS, 2);
  const legacy: RawSave = { preferences: LEGACY_PREFERENCES, profiles: null };

  it('pasa los récords a los perfiles, sin dueño, y los saca de las preferencias', () => {
    const result = toV2(legacy);
    expect(result.fromVersion).toBe(1);
    expect(read(result.documents.profiles)).toEqual({
      version: 2,
      profiles: [],
      activeProfileId: null,
      records: [],
      unassignedRecords: { [LAGO]: 72480.5, puerto: 81000 },
    });
    expect(read(result.documents.preferences)).toEqual({
      version: 2,
      controlMode: 'buttons',
      tiltNeutralAngle: 0.12,
      tiltSensitivity: 7,
      tiltDeadZone: 0.05,
      soundEnabled: false,
      vibrationEnabled: true,
    });
  });

  it('conserva todas las preferencias, también las que esta versión no conoce', () => {
    const raw = JSON.stringify({ controlMode: 'tilt', futuro: { a: 1 }, bestLapsMs: {} });
    const result = toV2({ preferences: raw, profiles: null });
    expect(read(result.documents.preferences)).toEqual({
      version: 2,
      controlMode: 'tilt',
      futuro: { a: 1 },
    });
  });

  it('escribe primero los perfiles y después las preferencias', () => {
    const { writes, documents } = toV2(legacy);
    expect(writes).toEqual([
      { document: 'profiles', json: documents.profiles },
      { document: 'preferences', json: documents.preferences },
    ]);
  });

  it('descarta los tiempos inválidos', () => {
    const raw = JSON.stringify({ bestLapsMs: { [LAGO]: 70000, cero: 0, roto: -1, texto: '1:10' } });
    const { documents } = toV2({ preferences: raw, profiles: null });
    expect(read(documents.profiles).unassignedRecords).toEqual({ [LAGO]: 70000 });
  });

  it('sin récords crea igual el documento de perfiles, vacío', () => {
    const raw = JSON.stringify({ controlMode: 'buttons' });
    const { documents } = toV2({ preferences: raw, profiles: null });
    expect(read(documents.profiles).unassignedRecords).toEqual({});
  });

  it('si se cortó después de escribir los perfiles, solo limpia las preferencias', () => {
    const first = toV2(legacy);
    // Los perfiles quedaron escritos (y hasta se creó un perfil); las preferencias, no.
    const profiles = JSON.stringify({
      ...read(first.documents.profiles),
      profiles: [{ id: 'p1', name: 'Male', colorId: 'blue', number: 7, createdAt: 1 }],
      records: [{ profileId: 'p1', circuitId: LAGO, lapMs: 72480.5, setAt: 1 }],
      unassignedRecords: {},
    });
    const second = toV2({ preferences: LEGACY_PREFERENCES, profiles });
    expect(second.writes.map((write) => write.document)).toEqual(['preferences']);
    expect(second.documents.profiles).toBe(profiles);
    expect(read(second.documents.preferences)).not.toHaveProperty('bestLapsMs');
  });

  it('migrar dos veces da lo mismo: la segunda no escribe nada', () => {
    const { documents } = toV2(legacy);
    const again = toV2(documents);
    expect(again.fromVersion).toBe(2);
    expect(again.writes).toEqual([]);
    expect(again.documents).toEqual(documents);
  });

  it('con las preferencias rotas, no toca nada', () => {
    const result = toV2({ preferences: '{roto', profiles: null });
    expect(result.fromVersion).toBeNull();
    expect(result.writes).toEqual([]);
    expect(result.documents.preferences).toBe('{roto');
  });
});

describe('migrateSave: de la versión 2 (perfiles) a la 3 (ranking)', () => {
  const toV3 = (raw: RawSave) => migrateSave(raw, SAVE_MIGRATIONS, 3);
  /** Perfiles como los guarda el hito 6a. */
  const V2_PROFILES = JSON.stringify({
    version: 2,
    profiles: [{ id: 'p1', name: 'Male', colorId: 'pink', number: 27, createdAt: 1 }],
    activeProfileId: 'p1',
    records: [{ profileId: 'p1', circuitId: LAGO, lapMs: 58533.3, setAt: 1 }],
    unassignedRecords: {},
  });
  const V2_PREFERENCES = JSON.stringify({ version: 2, controlMode: null, soundEnabled: true });

  it('las mejores vueltas pasan a lapRecords y las carreras arrancan vacías', () => {
    const result = toV3({ profiles: V2_PROFILES, preferences: V2_PREFERENCES });
    expect(result.fromVersion).toBe(2);
    expect(read(result.documents.profiles)).toEqual({
      version: 3,
      profiles: [{ id: 'p1', name: 'Male', colorId: 'pink', number: 27, createdAt: 1 }],
      activeProfileId: 'p1',
      lapRecords: [{ profileId: 'p1', circuitId: LAGO, lapMs: 58533.3, setAt: 1 }],
      raceRecords: [],
      unassignedRecords: {},
    });
  });

  it('las preferencias solo cambian el número de versión', () => {
    const result = toV3({ profiles: V2_PROFILES, preferences: V2_PREFERENCES });
    expect(read(result.documents.preferences)).toEqual({
      version: 3,
      controlMode: null,
      soundEnabled: true,
    });
    expect(result.writes.map((write) => write.document)).toEqual(['profiles', 'preferences']);
  });

  it('si los perfiles ya tienen lapRecords (se cortó a mitad), no los pisa', () => {
    const half = JSON.stringify({
      ...read(V2_PROFILES),
      version: 3,
      records: undefined,
      lapRecords: [{ profileId: 'p1', circuitId: LAGO, lapMs: 50000, setAt: 2 }],
      raceRecords: [{ profileId: 'p1', circuitId: LAGO, laps: 3, totalMs: 180000, setAt: 2 }],
    });
    const result = toV3({ profiles: half, preferences: V2_PREFERENCES });
    expect(result.writes.map((write) => write.document)).toEqual(['preferences']);
    expect(result.documents.profiles).toBe(half);
  });

  it('sin récords (perfiles recién migrados de la 1) quedan las dos listas vacías', () => {
    const fromV1 = toV3({ preferences: LEGACY_PREFERENCES, profiles: null });
    expect(fromV1.fromVersion).toBe(1);
    const profiles = read(fromV1.documents.profiles);
    expect(profiles).toMatchObject({ version: 3, lapRecords: [], raceRecords: [] });
    expect(profiles).not.toHaveProperty('records');
    expect(profiles.unassignedRecords).toEqual({ [LAGO]: 72480.5, puerto: 81000 });
  });

  it('migrar dos veces da lo mismo', () => {
    const { documents } = toV3({ profiles: V2_PROFILES, preferences: V2_PREFERENCES });
    expect(toV3(documents).writes).toEqual([]);
  });
});

describe('migrateSave: de la versión 3 (ranking) a la 4 (fantasma)', () => {
  /** Datos como los guarda el hito 6b: con récords, sin fantasmas. */
  const V3_PROFILES = JSON.stringify({
    version: 3,
    profiles: [{ id: 'p1', name: 'Male', colorId: 'pink', number: 27, createdAt: 1 }],
    activeProfileId: 'p1',
    lapRecords: [{ profileId: 'p1', circuitId: LAGO, lapMs: 58533.3, setAt: 1 }],
    raceRecords: [{ profileId: 'p1', circuitId: LAGO, laps: 3, totalMs: 180000, setAt: 1 }],
    unassignedRecords: {},
  });
  const V3_PREFERENCES = JSON.stringify({ version: 3, controlMode: 'buttons', soundEnabled: true });

  it('los perfiles suman la lista de fantasmas, vacía, y conservan todo lo demás', () => {
    const result = migrateSave({ profiles: V3_PROFILES, preferences: V3_PREFERENCES });
    expect(result.fromVersion).toBe(3);
    expect(read(result.documents.profiles)).toEqual({
      ...read(V3_PROFILES),
      version: 4,
      ghosts: [],
    });
  });

  it('las preferencias suman el fantasma de la mejor vuelta del jugador', () => {
    const result = migrateSave({ profiles: V3_PROFILES, preferences: V3_PREFERENCES });
    expect(read(result.documents.preferences)).toEqual({
      version: 4,
      controlMode: 'buttons',
      soundEnabled: true,
      ghostSource: 'mine',
    });
    expect(result.writes.map((write) => write.document)).toEqual(['profiles', 'preferences']);
  });

  it('no pisa los fantasmas ni la elección si ya estaban (migración cortada a mitad)', () => {
    const ghosts = [{ profileId: 'p1', circuitId: LAGO, setAt: 5, recording: { v: 1 } }];
    const half = JSON.stringify({ ...read(V3_PROFILES), ghosts });
    const chosen = JSON.stringify({ version: 3, ghostSource: 'record' });
    const result = migrateSave({ profiles: half, preferences: chosen });
    expect(read(result.documents.profiles).ghosts).toEqual(ghosts);
    expect(read(result.documents.preferences).ghostSource).toBe('record');
  });

  it('sin perfiles guardados migra solo las preferencias', () => {
    const result = migrateSave({ profiles: null, preferences: V3_PREFERENCES });
    expect(result.documents.profiles).toBeNull();
    expect(read(result.documents.preferences)).toMatchObject({ version: 4, ghostSource: 'mine' });
  });

  it('desde la versión 1 llega hasta la actual con todo en su lugar', () => {
    const result = migrateSave({ preferences: LEGACY_PREFERENCES, profiles: null });
    expect(read(result.documents.profiles)).toMatchObject({
      version: SAVE_VERSION,
      lapRecords: [],
      raceRecords: [],
      ghosts: [],
      unassignedRecords: { [LAGO]: 72480.5, puerto: 81000 },
    });
    expect(read(result.documents.preferences)).toMatchObject({
      version: SAVE_VERSION,
      ghostSource: 'mine',
      controlMode: 'buttons',
    });
  });

  it('migrar dos veces da lo mismo: la segunda no escribe nada', () => {
    const { documents } = migrateSave({ profiles: V3_PROFILES, preferences: V3_PREFERENCES });
    expect(migrateSave(documents).writes).toEqual([]);
  });
});

describe('migrateSave: otros casos', () => {
  it('sin nada guardado (instalación nueva) no escribe nada', () => {
    expect(migrateSave({ preferences: null, profiles: null })).toEqual({
      fromVersion: null,
      documents: { preferences: null, profiles: null },
      writes: [],
    });
  });

  it('con datos de una versión más nueva que la app, no toca nada', () => {
    const raw: RawSave = {
      preferences: JSON.stringify({ version: SAVE_VERSION + 1, bestLapsMs: { [LAGO]: 1 } }),
      profiles: JSON.stringify({ version: SAVE_VERSION + 1, otro: true }),
    };
    expect(migrateSave(raw)).toEqual({ fromVersion: SAVE_VERSION + 1, documents: raw, writes: [] });
  });

  it('aplica los pasos en orden hasta la versión pedida', () => {
    const next = SAVE_VERSION + 1;
    const steps: SaveMigration[] = [
      ...SAVE_MIGRATIONS,
      {
        from: SAVE_VERSION,
        to: next,
        migrate: ({ profiles, preferences }) => ({
          profiles: profiles && { ...profiles, futuro: [] },
          preferences,
        }),
      },
    ];
    const result = migrateSave({ preferences: LEGACY_PREFERENCES, profiles: null }, steps, next);
    expect(result.fromVersion).toBe(1);
    const profiles = read(result.documents.profiles);
    expect(profiles.version).toBe(next);
    expect(profiles.futuro).toEqual([]);
    expect(profiles.lapRecords).toEqual([]);
    expect(profiles.unassignedRecords[LAGO]).toBe(72480.5);
    expect(read(result.documents.preferences).version).toBe(next);
  });

  it('si falta un paso, no toca nada', () => {
    const raw: RawSave = { preferences: LEGACY_PREFERENCES, profiles: null };
    expect(migrateSave(raw, SAVE_MIGRATIONS, SAVE_VERSION + 1)).toEqual({
      fromVersion: 1,
      documents: raw,
      writes: [],
    });
  });

  it('no escribe un documento que no cambió', () => {
    // Las preferencias ya están en la versión actual, con todo: no hay nada que reescribir.
    const preferences = JSON.stringify({
      version: SAVE_VERSION,
      controlMode: 'buttons',
      ghostSource: 'mine',
    });
    const profiles = JSON.stringify({ version: SAVE_VERSION - 1, profiles: [] });
    const result = migrateSave({ preferences, profiles });
    expect(result.writes.map((write) => write.document)).toEqual(['profiles']);
  });
});
