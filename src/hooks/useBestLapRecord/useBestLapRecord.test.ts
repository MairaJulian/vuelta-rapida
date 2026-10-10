import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { getBestLap } from '@/core/Profiles';
import {
  createPlayerProfile,
  PROFILES_KEY,
  readProfiles,
  reloadProfiles,
  selectPlayerProfile,
  updateProfiles,
} from '@/hooks/useProfiles';

import { useBestLapRecord } from './useBestLapRecord';

const storage = Storage as unknown as { __reset: () => void; getItemSync: (key: string) => string };

const LAGO = 'autodromo-del-lago';

async function renderRecord(circuitId = LAGO) {
  return renderHook(() => useBestLapRecord({ circuitId, stepHz: 60 }));
}

/** Crea un perfil (queda activo) y devuelve su id. */
function createProfile(name: string) {
  const result = createPlayerProfile({ name, colorId: 'blue', number: 7 });
  if (!result.ok) {
    throw new Error(result.errors.join(', '));
  }
  return result.profile.id;
}

const best = (profileId: string | null, circuitId = LAGO) =>
  getBestLap(readProfiles(), profileId, circuitId);

describe('useBestLapRecord', () => {
  let male = '';

  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadProfiles());
    await act(() => {
      male = createProfile('Male');
    });
  });

  it('sin récord guardado, devuelve null', async () => {
    const { result } = await renderRecord();
    expect(result.current.recordMs).toBeNull();
  });

  it('la primera vuelta queda como récord del perfil activo, en milisegundos, y se guarda', async () => {
    const { result } = await renderRecord();
    await act(() => result.current.saveLap(4320)); // 72 s a 60 pasos por segundo
    expect(result.current.recordMs).toBe(72000);
    expect(JSON.parse(storage.getItemSync(PROFILES_KEY)).records).toEqual([
      expect.objectContaining({ profileId: male, circuitId: LAGO, lapMs: 72000 }),
    ]);
  });

  it('solo una vuelta más rápida reemplaza el récord', async () => {
    const { result } = await renderRecord();
    await act(() => result.current.saveLap(4320));
    await act(() => result.current.saveLap(4500));
    expect(result.current.recordMs).toBe(72000);
    await act(() => result.current.saveLap(4200));
    expect(result.current.recordMs).toBe(70000);
  });

  it('cada circuito tiene su récord', async () => {
    const other = await renderRecord('otro');
    await act(() => other.result.current.saveLap(3000));
    const { result } = await renderRecord();
    await act(() => result.current.saveLap(4320));
    expect(best(male, 'otro')).toBe(50000);
    expect(best(male)).toBe(72000);
  });

  it('cada jugador tiene su récord, y se ve el del activo', async () => {
    const { result } = await renderRecord();
    await act(() => result.current.saveLap(4320));
    let tomi = '';
    await act(() => {
      tomi = createProfile('Tomi');
    });
    expect(result.current.recordMs).toBeNull();
    await act(() => result.current.saveLap(4500));
    expect(best(tomi)).toBe(75000);
    expect(best(male)).toBe(72000);

    await act(() => selectPlayerProfile(male));
    expect(result.current.recordMs).toBe(72000);
  });

  it('compara con el récord del momento, aunque haya cambiado desde el último render', async () => {
    const { result } = await renderRecord();
    const { saveLap } = result.current;
    await act(() =>
      updateProfiles((state) => ({
        ...state,
        records: [{ profileId: male, circuitId: LAGO, lapMs: 60000, setAt: 1 }],
      })),
    );
    await act(() => saveLap(4320));
    expect(best(male)).toBe(60000);
  });

  it('saveLap es la misma función aunque cambien los perfiles (y el récord)', async () => {
    const { result } = await renderRecord();
    const first = result.current.saveLap;
    await act(() => first(4320));
    await act(() => {
      createProfile('Tomi');
    });
    expect(result.current.saveLap).toBe(first);
  });
});

describe('useBestLapRecord sin perfil activo', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadProfiles());
  });

  it('la vuelta queda sin dueño y pasa al primer perfil que se cree', async () => {
    const { result } = await renderRecord();
    await act(() => result.current.saveLap(4320));
    expect(result.current.recordMs).toBe(72000);
    expect(best(null)).toBe(72000);

    let male = '';
    await act(() => {
      male = createProfile('Male');
    });
    expect(best(male)).toBe(72000);
    expect(best(null)).toBeNull();
  });
});
