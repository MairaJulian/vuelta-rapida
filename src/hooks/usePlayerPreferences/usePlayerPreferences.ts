import { useSyncExternalStore } from 'react';

import { parsePlayerPreferences, serializePlayerPreferences } from '@/core/PlayerPreferences';
import type { PlayerPreferences } from '@/core/PlayerPreferences';
import {
  readSaveDocument,
  reloadSaveStore,
  SAVE_KEYS,
  writeSaveDocument,
} from '@/storage/SaveStore';

import type { UsePlayerPreferencesResult } from './usePlayerPreferences.types';

/** Clave en el almacenamiento clave-valor de expo-sqlite. */
export const PREFERENCES_KEY = SAVE_KEYS.preferences;

let cache: PlayerPreferences | null = null;
const listeners = new Set<() => void>();

/** Lectura síncrona: la primera vez lee del disco (ya migrado), después usa la copia en memoria. */
export function readPlayerPreferences(): PlayerPreferences {
  if (cache === null) {
    // Sin almacenamiento disponible, llega null: se juega con los valores por defecto.
    cache = parsePlayerPreferences(readSaveDocument('preferences'));
  }
  return cache;
}

/** Cambia algunos campos, los guarda y avisa a todas las pantallas que los usan. */
export function updatePlayerPreferences(changes: Partial<PlayerPreferences>): void {
  cache = { ...readPlayerPreferences(), ...changes };
  // Si no se pudo guardar, el cambio vale igual para esta sesión.
  writeSaveDocument('preferences', serializePlayerPreferences(cache));
  listeners.forEach((listener) => listener());
}

/** Olvida la copia en memoria; la próxima lectura vuelve al disco (y migra, si hace falta). */
export function reloadPlayerPreferences(): void {
  cache = null;
  reloadSaveStore();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Preferencias del celular guardadas entre partidas (modo de control, calibración,
 * sensibilidad, zona muerta, sonido y vibración). Las comparten todos los perfiles. La
 * lectura es síncrona, así que la primera pantalla decide sin estado de carga.
 */
export function usePlayerPreferences(): UsePlayerPreferencesResult {
  const preferences = useSyncExternalStore(subscribe, readPlayerPreferences);
  return { preferences, updatePreferences: updatePlayerPreferences };
}
