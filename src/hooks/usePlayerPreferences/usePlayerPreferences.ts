import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { parsePlayerPreferences, serializePlayerPreferences } from '@/core/PlayerPreferences';
import type { PlayerPreferences } from '@/core/PlayerPreferences';

import type { UsePlayerPreferencesResult } from './usePlayerPreferences.types';

/** Clave en el almacenamiento clave-valor de expo-sqlite. */
export const PREFERENCES_KEY = 'player-preferences';

let cache: PlayerPreferences | null = null;
const listeners = new Set<() => void>();

/** Lectura síncrona: la primera vez lee del disco, después usa la copia en memoria. */
export function readPlayerPreferences(): PlayerPreferences {
  if (cache === null) {
    let raw: string | null = null;
    try {
      raw = Storage.getItemSync(PREFERENCES_KEY);
    } catch {
      // Sin almacenamiento disponible: se juega con los valores por defecto.
    }
    cache = parsePlayerPreferences(raw);
  }
  return cache;
}

/** Cambia algunos campos, los guarda y avisa a todas las pantallas que los usan. */
export function updatePlayerPreferences(changes: Partial<PlayerPreferences>): void {
  cache = { ...readPlayerPreferences(), ...changes };
  try {
    Storage.setItemSync(PREFERENCES_KEY, serializePlayerPreferences(cache));
  } catch {
    // Si no se pudo guardar, el cambio vale igual para esta sesión.
  }
  listeners.forEach((listener) => listener());
}

/** Olvida la copia en memoria; la próxima lectura vuelve al disco. */
export function reloadPlayerPreferences(): void {
  cache = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Preferencias del jugador guardadas entre partidas (modo de control, calibración
 * y sensibilidad). La lectura es síncrona, así que la primera pantalla decide sin
 * estado de carga.
 */
export function usePlayerPreferences(): UsePlayerPreferencesResult {
  const preferences = useSyncExternalStore(subscribe, readPlayerPreferences);
  return { preferences, updatePreferences: updatePlayerPreferences };
}
