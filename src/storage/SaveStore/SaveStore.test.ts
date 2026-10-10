import Storage from 'expo-sqlite/kv-store';

import { SAVE_VERSION } from '@/core/SaveData';

import {
  ensureSaveMigrated,
  readSaveDocument,
  reloadSaveStore,
  SAVE_KEYS,
  writeSaveDocument,
} from './SaveStore';

const storage = Storage as unknown as {
  getItemSync: jest.Mock;
  setItemSync: jest.Mock;
  __reset: () => void;
};

const LAGO = 'autodromo-del-lago';

/** Preferencias como las guarda la versión de antes de los perfiles. */
const LEGACY_PREFERENCES = JSON.stringify({
  controlMode: 'buttons',
  bestLapsMs: { [LAGO]: 72480 },
  soundEnabled: false,
});

const onDisk = (key: string) => {
  const raw = storage.getItemSync(key);
  return raw === null ? null : JSON.parse(raw);
};

describe('SaveStore', () => {
  beforeEach(() => {
    storage.__reset();
    reloadSaveStore();
    jest.clearAllMocks();
  });

  it('usa la clave de siempre para las preferencias y una nueva para los perfiles', () => {
    expect(SAVE_KEYS).toEqual({ preferences: 'player-preferences', profiles: 'player-profiles' });
  });

  it('en una instalación nueva no escribe nada', () => {
    expect(readSaveDocument('profiles')).toBeNull();
    expect(readSaveDocument('preferences')).toBeNull();
    expect(storage.setItemSync).not.toHaveBeenCalled();
  });

  it('migra los datos de antes de los perfiles en la primera lectura', () => {
    storage.setItemSync(SAVE_KEYS.preferences, LEGACY_PREFERENCES);
    storage.setItemSync.mockClear();

    const profiles = JSON.parse(readSaveDocument('profiles')!);
    expect(profiles.unassignedRecords).toEqual({ [LAGO]: 72480 });
    expect(onDisk(SAVE_KEYS.profiles)).toEqual(profiles);
    expect(onDisk(SAVE_KEYS.preferences)).toEqual({
      version: SAVE_VERSION,
      controlMode: 'buttons',
      soundEnabled: false,
    });
    // Primero los perfiles, después las preferencias.
    expect(storage.setItemSync.mock.calls.map(([key]) => key)).toEqual([
      SAVE_KEYS.profiles,
      SAVE_KEYS.preferences,
    ]);
  });

  it('migra una sola vez por sesión', () => {
    storage.setItemSync(SAVE_KEYS.preferences, LEGACY_PREFERENCES);
    ensureSaveMigrated();
    storage.getItemSync.mockClear();
    ensureSaveMigrated();
    readSaveDocument('preferences');
    expect(storage.getItemSync).toHaveBeenCalledTimes(1);
  });

  it('una escritura antes de cualquier lectura también migra primero', () => {
    storage.setItemSync(SAVE_KEYS.preferences, LEGACY_PREFERENCES);
    writeSaveDocument('preferences', JSON.stringify({ version: SAVE_VERSION }));
    expect(onDisk(SAVE_KEYS.profiles).unassignedRecords).toEqual({ [LAGO]: 72480 });
  });

  it('lee y escribe documentos', () => {
    expect(writeSaveDocument('profiles', '{"version":2}')).toBe(true);
    expect(readSaveDocument('profiles')).toBe('{"version":2}');
  });

  it('si el disco falla al leer, no hay datos y no se toca nada', () => {
    storage.setItemSync(SAVE_KEYS.preferences, LEGACY_PREFERENCES);
    storage.setItemSync.mockClear();
    storage.getItemSync.mockImplementationOnce(() => {
      throw new Error('sin disco');
    });
    expect(readSaveDocument('profiles')).toBeNull();
    expect(storage.setItemSync).not.toHaveBeenCalled();
  });

  it('si falla al escribir, devuelve false', () => {
    storage.setItemSync.mockImplementationOnce(() => {
      throw new Error('disco lleno');
    });
    expect(writeSaveDocument('profiles', '{}')).toBe(false);
  });

  describe('si la migración no se pudo escribir', () => {
    beforeEach(() => {
      storage.setItemSync(SAVE_KEYS.preferences, LEGACY_PREFERENCES);
      // Falla la escritura de los perfiles, la primera de la migración.
      storage.setItemSync.mockImplementationOnce(() => {
        throw new Error('disco lleno');
      });
      ensureSaveMigrated();
    });

    it('el disco queda como estaba, sin perder los récords', () => {
      expect(onDisk(SAVE_KEYS.profiles)).toBeNull();
      expect(onDisk(SAVE_KEYS.preferences).bestLapsMs).toEqual({ [LAGO]: 72480 });
    });

    it('durante la sesión se leen los documentos migrados', () => {
      expect(JSON.parse(readSaveDocument('profiles')!).unassignedRecords).toEqual({
        [LAGO]: 72480,
      });
      expect(JSON.parse(readSaveDocument('preferences')!)).not.toHaveProperty('bestLapsMs');
    });

    it('guardar las preferencias escribe antes los perfiles pendientes', () => {
      expect(writeSaveDocument('preferences', '{"version":2,"soundEnabled":true}')).toBe(true);
      expect(onDisk(SAVE_KEYS.profiles).unassignedRecords).toEqual({ [LAGO]: 72480 });
      expect(onDisk(SAVE_KEYS.preferences)).toEqual({ version: 2, soundEnabled: true });
    });

    it('si los perfiles siguen sin poder escribirse, tampoco escribe las preferencias', () => {
      storage.setItemSync.mockImplementationOnce(() => {
        throw new Error('disco lleno');
      });
      expect(writeSaveDocument('preferences', '{"version":2}')).toBe(false);
      expect(onDisk(SAVE_KEYS.preferences).bestLapsMs).toEqual({ [LAGO]: 72480 });
    });

    it('la próxima sesión vuelve a migrar', () => {
      reloadSaveStore();
      expect(JSON.parse(readSaveDocument('profiles')!).unassignedRecords).toEqual({
        [LAGO]: 72480,
      });
      expect(onDisk(SAVE_KEYS.preferences)).not.toHaveProperty('bestLapsMs');
    });
  });
});
