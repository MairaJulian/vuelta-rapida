import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';

import { DEFAULT_PLAYER_PREFERENCES } from '@/core/PlayerPreferences';
import { SAVE_VERSION } from '@/core/SaveData';

import {
  PREFERENCES_KEY,
  readPlayerPreferences,
  reloadPlayerPreferences,
  updatePlayerPreferences,
  usePlayerPreferences,
} from './usePlayerPreferences';

const storage = Storage as unknown as {
  getItemSync: jest.Mock;
  setItemSync: jest.Mock;
  __reset: () => void;
};

describe('usePlayerPreferences', () => {
  beforeEach(() => {
    storage.__reset();
    reloadPlayerPreferences();
  });

  it('sin nada guardado arranca con los valores por defecto', async () => {
    const { result } = await renderHook(() => usePlayerPreferences());
    expect(result.current.preferences).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it('lee de forma síncrona lo que estaba guardado', () => {
    storage.setItemSync(
      PREFERENCES_KEY,
      JSON.stringify({
        controlMode: 'tilt',
        tiltNeutralAngle: 0.1,
        tiltSensitivity: 6,
        tiltDeadZone: 0.05,
      }),
    );
    reloadPlayerPreferences();
    expect(readPlayerPreferences()).toEqual({
      controlMode: 'tilt',
      tiltNeutralAngle: 0.1,
      tiltSensitivity: 6,
      tiltDeadZone: 0.05,
      soundEnabled: true,
      ghostSource: 'mine',
      vibrationEnabled: true,
    });
  });

  it('con datos de antes de los perfiles, conserva las preferencias y migra el disco', () => {
    storage.setItemSync(
      PREFERENCES_KEY,
      JSON.stringify({ controlMode: 'buttons', soundEnabled: false, bestLapsMs: { lago: 70000 } }),
    );
    reloadPlayerPreferences();
    expect(readPlayerPreferences()).toMatchObject({ controlMode: 'buttons', soundEnabled: false });
    expect(JSON.parse(storage.getItemSync(PREFERENCES_KEY))).toEqual({
      version: SAVE_VERSION,
      controlMode: 'buttons',
      soundEnabled: false,
      ghostSource: 'mine',
    });
  });

  it('guarda con el número de versión', () => {
    updatePlayerPreferences({ soundEnabled: false });
    expect(JSON.parse(storage.getItemSync(PREFERENCES_KEY)).version).toBe(SAVE_VERSION);
  });

  it('guarda los cambios y los conserva al volver a leer del disco', async () => {
    const { result } = await renderHook(() => usePlayerPreferences());
    await act(() => result.current.updatePreferences({ controlMode: 'buttons' }));
    expect(result.current.preferences.controlMode).toBe('buttons');
    await act(() => reloadPlayerPreferences());
    expect(readPlayerPreferences().controlMode).toBe('buttons');
  });

  it('todas las pantallas montadas ven el cambio', async () => {
    const first = await renderHook(() => usePlayerPreferences());
    const second = await renderHook(() => usePlayerPreferences());
    await act(() => updatePlayerPreferences({ tiltSensitivity: 9 }));
    expect(first.result.current.preferences.tiltSensitivity).toBe(9);
    expect(second.result.current.preferences.tiltSensitivity).toBe(9);
  });

  it('si el almacenamiento falla, se juega con los valores por defecto', () => {
    storage.getItemSync.mockImplementationOnce(() => {
      throw new Error('sin disco');
    });
    reloadPlayerPreferences();
    expect(readPlayerPreferences()).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it('si no se puede guardar, el cambio vale igual para esta sesión', () => {
    storage.setItemSync.mockImplementationOnce(() => {
      throw new Error('disco lleno');
    });
    updatePlayerPreferences({ controlMode: 'tilt' });
    expect(readPlayerPreferences().controlMode).toBe('tilt');
  });
});
