import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { SAVE_VERSION } from '@/core/SaveData';
import { PREFERENCES_KEY, reloadPlayerPreferences } from '@/hooks/usePlayerPreferences';

import {
  createPlayerProfile,
  PROFILES_KEY,
  readProfiles,
  reloadProfiles,
  updateProfiles,
  useProfiles,
} from './useProfiles';

const storage = Storage as unknown as {
  getItemSync: jest.Mock;
  setItemSync: jest.Mock;
  __reset: () => void;
};

const LAGO = 'autodromo-del-lago';
const male = { name: 'Male', colorId: 'blue', number: 27 } as const;
const tomi = { name: 'Tomi', colorId: 'coral', number: 7 } as const;

const saved = () => JSON.parse(storage.getItemSync(PROFILES_KEY));

describe('useProfiles', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => {
      reloadProfiles();
      reloadPlayerPreferences();
    });
  });

  it('sin nada guardado, no hay perfiles ni jugador activo', async () => {
    const { result } = await renderHook(() => useProfiles());
    expect(result.current.profiles).toEqual([]);
    expect(result.current.activeProfile).toBeNull();
  });

  it('crea un perfil, lo deja activo y lo guarda con el número de versión', async () => {
    const { result } = await renderHook(() => useProfiles());
    let created: ReturnType<typeof createPlayerProfile> | undefined;
    await act(() => {
      created = result.current.createProfile({ ...male, name: '  Male ' });
    });
    expect(created?.ok).toBe(true);
    expect(result.current.activeProfile).toMatchObject({
      name: 'Male',
      colorId: 'blue',
      number: 27,
    });
    expect(saved().version).toBe(SAVE_VERSION);
    expect(saved().profiles).toHaveLength(1);
    expect(saved().activeProfileId).toBe(result.current.activeProfile?.id);
  });

  it('cada perfil tiene un id distinto y su fecha de creación', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const { result } = await renderHook(() => useProfiles());
    await act(() => {
      result.current.createProfile(male);
      result.current.createProfile(tomi);
    });
    jest.mocked(Math.random).mockRestore();
    const [first, second] = result.current.profiles;
    expect(first.id).not.toBe(second.id);
    expect(first.createdAt).toBeGreaterThan(0);
  });

  it('con datos inválidos no guarda nada y devuelve los errores', async () => {
    const { result } = await renderHook(() => useProfiles());
    let created: ReturnType<typeof createPlayerProfile> | undefined;
    await act(() => {
      created = result.current.createProfile({ ...male, name: ' ' });
    });
    expect(created).toEqual({ ok: false, errors: ['name-empty'] });
    expect(storage.getItemSync(PROFILES_KEY)).toBeNull();
  });

  it('edita, elige y borra perfiles', async () => {
    const { result } = await renderHook(() => useProfiles());
    await act(() => {
      result.current.createProfile(male);
      result.current.createProfile(tomi);
    });
    const [first, second] = result.current.profiles;
    expect(result.current.activeProfile?.id).toBe(second.id);

    await act(() => result.current.selectProfile(first.id));
    expect(result.current.activeProfile?.id).toBe(first.id);

    await act(() => {
      result.current.updateProfile(first.id, { ...male, name: 'Maca', colorId: 'pink' });
    });
    expect(result.current.activeProfile).toMatchObject({ name: 'Maca', colorId: 'pink' });

    await act(() => result.current.deleteProfile(first.id));
    expect(result.current.profiles.map((profile) => profile.name)).toEqual(['Tomi']);
    expect(result.current.activeProfile).toBeNull();
    expect(saved().profiles).toHaveLength(1);
  });

  it('todas las pantallas montadas ven el cambio', async () => {
    const first = await renderHook(() => useProfiles());
    const second = await renderHook(() => useProfiles());
    await act(() => {
      createPlayerProfile(male);
    });
    expect(first.result.current.profiles).toHaveLength(1);
    expect(second.result.current.profiles).toHaveLength(1);
  });

  it('un cambio que no cambia nada no escribe', async () => {
    await act(() => {
      createPlayerProfile(male);
    });
    storage.setItemSync.mockClear();
    await act(() => updateProfiles((state) => state));
    expect(storage.setItemSync).not.toHaveBeenCalled();
  });

  it('lo guardado se conserva al volver a leer del disco', async () => {
    await act(() => {
      createPlayerProfile(male);
    });
    await act(() => reloadProfiles());
    expect(readProfiles().profiles.map((profile) => profile.name)).toEqual(['Male']);
  });

  it('migra los récords de antes de los perfiles y se los da al primer perfil', async () => {
    storage.setItemSync(
      PREFERENCES_KEY,
      JSON.stringify({ controlMode: 'buttons', bestLapsMs: { [LAGO]: 72480 } }),
    );
    await act(() => reloadProfiles());
    expect(readProfiles().unassignedRecords).toEqual({ [LAGO]: 72480 });

    await act(() => {
      createPlayerProfile(male);
    });
    const state = readProfiles();
    expect(state.lapRecords).toEqual([
      expect.objectContaining({ profileId: state.activeProfileId, circuitId: LAGO, lapMs: 72480 }),
    ]);
    expect(saved().unassignedRecords).toEqual({});
  });

  it('si no se puede guardar, el cambio vale igual para esta sesión', async () => {
    readProfiles();
    storage.setItemSync.mockImplementationOnce(() => {
      throw new Error('disco lleno');
    });
    await act(() => {
      createPlayerProfile(male);
    });
    expect(readProfiles().profiles).toHaveLength(1);
  });
});
