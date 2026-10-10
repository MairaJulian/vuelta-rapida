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

describe('migrateSave: de la versión actual (1, sin perfiles) a la 2', () => {
  const legacy: RawSave = { preferences: LEGACY_PREFERENCES, profiles: null };

  it('pasa los récords a los perfiles, sin dueño, y los saca de las preferencias', () => {
    const result = migrateSave(legacy);
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
    const result = migrateSave({ preferences: raw, profiles: null });
    expect(read(result.documents.preferences)).toEqual({
      version: 2,
      controlMode: 'tilt',
      futuro: { a: 1 },
    });
  });

  it('escribe primero los perfiles y después las preferencias', () => {
    const { writes, documents } = migrateSave(legacy);
    expect(writes).toEqual([
      { document: 'profiles', json: documents.profiles },
      { document: 'preferences', json: documents.preferences },
    ]);
  });

  it('descarta los tiempos inválidos', () => {
    const raw = JSON.stringify({ bestLapsMs: { [LAGO]: 70000, cero: 0, roto: -1, texto: '1:10' } });
    const { documents } = migrateSave({ preferences: raw, profiles: null });
    expect(read(documents.profiles).unassignedRecords).toEqual({ [LAGO]: 70000 });
  });

  it('sin récords crea igual el documento de perfiles, vacío', () => {
    const raw = JSON.stringify({ controlMode: 'buttons' });
    const { documents } = migrateSave({ preferences: raw, profiles: null });
    expect(read(documents.profiles).unassignedRecords).toEqual({});
  });

  it('si se cortó después de escribir los perfiles, solo limpia las preferencias', () => {
    const first = migrateSave(legacy);
    // Los perfiles quedaron escritos (y hasta se creó un perfil); las preferencias, no.
    const profiles = JSON.stringify({
      ...read(first.documents.profiles),
      profiles: [{ id: 'p1', name: 'Male', colorId: 'blue', number: 7, createdAt: 1 }],
      records: [{ profileId: 'p1', circuitId: LAGO, lapMs: 72480.5, setAt: 1 }],
      unassignedRecords: {},
    });
    const second = migrateSave({ preferences: LEGACY_PREFERENCES, profiles });
    expect(second.writes.map((write) => write.document)).toEqual(['preferences']);
    expect(second.documents.profiles).toBe(profiles);
    expect(read(second.documents.preferences)).not.toHaveProperty('bestLapsMs');
  });

  it('migrar dos veces da lo mismo: la segunda no escribe nada', () => {
    const { documents } = migrateSave(legacy);
    const again = migrateSave(documents);
    expect(again.fromVersion).toBe(2);
    expect(again.writes).toEqual([]);
    expect(again.documents).toEqual(documents);
  });

  it('con las preferencias rotas, no toca nada', () => {
    const result = migrateSave({ preferences: '{roto', profiles: null });
    expect(result.fromVersion).toBeNull();
    expect(result.writes).toEqual([]);
    expect(result.documents.preferences).toBe('{roto');
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
    const steps: SaveMigration[] = [
      ...SAVE_MIGRATIONS,
      {
        from: 2,
        to: 3,
        migrate: ({ profiles, preferences }) => ({
          profiles: profiles && { ...profiles, ranking: [] },
          preferences,
        }),
      },
    ];
    const result = migrateSave({ preferences: LEGACY_PREFERENCES, profiles: null }, steps, 3);
    expect(result.fromVersion).toBe(1);
    const profiles = read(result.documents.profiles);
    expect(profiles.version).toBe(3);
    expect(profiles.ranking).toEqual([]);
    expect(profiles.unassignedRecords[LAGO]).toBe(72480.5);
    expect(read(result.documents.preferences).version).toBe(3);
  });

  it('si falta un paso, no toca nada', () => {
    const raw: RawSave = { preferences: LEGACY_PREFERENCES, profiles: null };
    expect(migrateSave(raw, SAVE_MIGRATIONS, 3)).toEqual({
      fromVersion: 1,
      documents: raw,
      writes: [],
    });
  });

  it('no escribe un documento que no cambió', () => {
    const preferences = JSON.stringify({ version: 2, controlMode: 'buttons' });
    const profiles = JSON.stringify({ controlMode: 'x' }); // sin versión: arrastra todo a la 1
    const result = migrateSave({ preferences, profiles });
    expect(result.writes.map((write) => write.document)).toEqual(['profiles']);
  });
});
