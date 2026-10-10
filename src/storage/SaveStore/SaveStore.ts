import Storage from 'expo-sqlite/kv-store';

import { migrateSave, SAVE_DOCUMENTS } from '@/core/SaveData';
import type { RawSave, SaveDocumentName } from '@/core/SaveData';

import type { SaveKeys } from './SaveStore.types';

/** Claves de expo-sqlite/kv-store. `player-preferences` es la de antes de los perfiles. */
export const SAVE_KEYS: SaveKeys = Object.freeze({
  preferences: 'player-preferences',
  profiles: 'player-profiles',
});

let migrated = false;
/**
 * Documentos migrados que no se pudieron escribir: se leen de aquí durante la sesión.
 * Como el disco quedó en la versión vieja, la próxima vez se vuelve a migrar.
 */
let unsaved: Partial<Record<SaveDocumentName, string>> = {};

/**
 * Escribe los documentos pendientes en el orden de `SAVE_DOCUMENTS`, hasta `until`
 * (sin incluirlo) o todos. Si uno falla, para: escribir las preferencias sin haber
 * escrito los perfiles perdería los récords que pasaron de unas a otros.
 */
function flushUnsaved(until?: SaveDocumentName): boolean {
  for (const document of SAVE_DOCUMENTS) {
    if (document === until) {
      return true;
    }
    const json = unsaved[document];
    if (json !== undefined) {
      try {
        Storage.setItemSync(SAVE_KEYS[document], json);
        delete unsaved[document];
      } catch {
        return false;
      }
    }
  }
  return true;
}

/**
 * Lleva los datos guardados a la versión actual (`core/SaveData`), una sola vez por
 * sesión y antes de cualquier lectura o escritura. Escribe en el orden que pide la
 * migración; si el disco falla, lo que falta queda en memoria.
 */
export function ensureSaveMigrated(): void {
  if (migrated) {
    return;
  }
  migrated = true;
  let raw: RawSave;
  try {
    raw = {
      profiles: Storage.getItemSync(SAVE_KEYS.profiles),
      preferences: Storage.getItemSync(SAVE_KEYS.preferences),
    };
  } catch {
    // Sin almacenamiento: se juega con los valores por defecto y no se toca nada.
    return;
  }
  const { writes } = migrateSave(raw);
  writes.forEach((write) => {
    unsaved[write.document] = write.json;
  });
  flushUnsaved();
}

/** Texto de un documento, ya migrado; `null` si no existe o si el disco falla. */
export function readSaveDocument(name: SaveDocumentName): string | null {
  ensureSaveMigrated();
  const pending = unsaved[name];
  if (pending !== undefined) {
    return pending;
  }
  try {
    return Storage.getItemSync(SAVE_KEYS[name]);
  } catch {
    return null;
  }
}

/** Guarda un documento. Devuelve si se pudo; si no, quien llama conserva el cambio en memoria. */
export function writeSaveDocument(name: SaveDocumentName, json: string): boolean {
  ensureSaveMigrated();
  if (!flushUnsaved(name)) {
    return false;
  }
  try {
    Storage.setItemSync(SAVE_KEYS[name], json);
    delete unsaved[name];
    return true;
  } catch {
    return false;
  }
}

/** Olvida lo hecho en la sesión: la próxima lectura vuelve al disco y migra de nuevo. */
export function reloadSaveStore(): void {
  migrated = false;
  unsaved = {};
}
