import { useSyncExternalStore } from 'react';

import {
  createProfile,
  createProfileId,
  deleteProfile,
  getActiveProfile,
  parseProfilesState,
  selectProfile,
  serializeProfilesState,
  updateProfile,
} from '@/core/Profiles';
import type { ProfileDraft, ProfileResult, ProfilesState } from '@/core/Profiles';
import {
  readSaveDocument,
  reloadSaveStore,
  SAVE_KEYS,
  writeSaveDocument,
} from '@/storage/SaveStore';

import type { UseProfilesResult } from './useProfiles.types';

/** Clave en el almacenamiento clave-valor de expo-sqlite. */
export const PROFILES_KEY = SAVE_KEYS.profiles;

let cache: ProfilesState | null = null;
const listeners = new Set<() => void>();

/** Lectura síncrona: la primera vez lee del disco (ya migrado), después usa la copia en memoria. */
export function readProfiles(): ProfilesState {
  if (cache === null) {
    cache = parseProfilesState(readSaveDocument('profiles'));
  }
  return cache;
}

/**
 * Aplica un cambio, lo guarda y avisa a todas las pantallas que lo usan. Si el cambio
 * devuelve el mismo estado, no hace nada. Si no se pudo guardar, vale para esta sesión.
 */
export function updateProfiles(change: (state: ProfilesState) => ProfilesState): void {
  const current = readProfiles();
  const next = change(current);
  if (next === current) {
    return;
  }
  cache = next;
  writeSaveDocument('profiles', serializeProfilesState(next));
  listeners.forEach((listener) => listener());
}

/** Olvida la copia en memoria; la próxima lectura vuelve al disco (y migra, si hace falta). */
export function reloadProfiles(): void {
  cache = null;
  reloadSaveStore();
  listeners.forEach((listener) => listener());
}

/** Crea un perfil con un id nuevo y la fecha de ahora; queda activo. */
export function createPlayerProfile(draft: ProfileDraft): ProfileResult {
  const state = readProfiles();
  const now = Date.now();
  const id = createProfileId(
    now,
    Math.random(),
    state.profiles.map((profile) => profile.id),
  );
  const result = createProfile(state, draft, { id, now });
  if (result.ok) {
    updateProfiles(() => result.state);
  }
  return result;
}

export function updatePlayerProfile(id: string, draft: ProfileDraft): ProfileResult {
  const result = updateProfile(readProfiles(), id, draft);
  if (result.ok) {
    updateProfiles(() => result.state);
  }
  return result;
}

export function deletePlayerProfile(id: string): void {
  updateProfiles((state) => deleteProfile(state, id));
}

export function selectPlayerProfile(id: string): void {
  updateProfiles((state) => selectProfile(state, id));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Perfiles de los jugadores del celular, el perfil activo y sus récords, guardados
 * entre partidas. La lectura es síncrona, como la de las preferencias: "¿Quién juega?"
 * se dibuja sin estado de carga.
 */
export function useProfiles(): UseProfilesResult {
  const state = useSyncExternalStore(subscribe, readProfiles);
  return {
    state,
    profiles: state.profiles,
    activeProfile: getActiveProfile(state),
    createProfile: createPlayerProfile,
    updateProfile: updatePlayerProfile,
    deleteProfile: deletePlayerProfile,
    selectProfile: selectPlayerProfile,
  };
}
