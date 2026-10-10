import type { SaveDocumentName } from '@/core/SaveData';

/** Clave del almacenamiento clave-valor de cada documento guardado. */
export type SaveKeys = Readonly<Record<SaveDocumentName, string>>;
