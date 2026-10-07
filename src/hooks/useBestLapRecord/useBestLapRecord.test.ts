import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import {
  PREFERENCES_KEY,
  readPlayerPreferences,
  reloadPlayerPreferences,
  updatePlayerPreferences,
} from '@/hooks/usePlayerPreferences';

import { useBestLapRecord } from './useBestLapRecord';

const storage = Storage as unknown as { __reset: () => void; getItemSync: (key: string) => string };

async function renderRecord(circuitId = 'autodromo-del-lago') {
  return renderHook(() => useBestLapRecord({ circuitId, stepHz: 60 }));
}

describe('useBestLapRecord', () => {
  beforeEach(async () => {
    storage.__reset();
    await act(() => reloadPlayerPreferences());
  });

  it('sin récord guardado, devuelve null', async () => {
    const { result } = await renderRecord();
    expect(result.current.recordMs).toBeNull();
  });

  it('la primera vuelta queda como récord, en milisegundos, y se guarda en el disco', async () => {
    const { result } = await renderRecord();
    await act(() => result.current.saveLap(4320)); // 72 s a 60 pasos por segundo
    expect(result.current.recordMs).toBe(72000);
    expect(JSON.parse(storage.getItemSync(PREFERENCES_KEY)).bestLapsMs).toEqual({
      'autodromo-del-lago': 72000,
    });
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
    await act(() => updatePlayerPreferences({ bestLapsMs: { otro: 50000 } }));
    const { result } = await renderRecord();
    await act(() => result.current.saveLap(4320));
    expect(readPlayerPreferences().bestLapsMs).toEqual({
      otro: 50000,
      'autodromo-del-lago': 72000,
    });
  });

  it('compara con el récord del momento, aunque haya cambiado desde el último render', async () => {
    const { result } = await renderRecord();
    const { saveLap } = result.current;
    await act(() => updatePlayerPreferences({ bestLapsMs: { 'autodromo-del-lago': 60000 } }));
    await act(() => saveLap(4320));
    expect(readPlayerPreferences().bestLapsMs['autodromo-del-lago']).toBe(60000);
  });

  it('saveLap es la misma función aunque cambien las preferencias (y el récord)', async () => {
    const { result } = await renderRecord();
    const first = result.current.saveLap;
    await act(() => first(4320));
    await act(() => updatePlayerPreferences({ tiltSensitivity: 7 }));
    expect(result.current.recordMs).toBe(72000);
    expect(result.current.saveLap).toBe(first);
  });
});
