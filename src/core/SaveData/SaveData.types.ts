/** Documentos que se guardan, cada uno en su propia clave del almacenamiento. */
export type SaveDocumentName = 'profiles' | 'preferences';

/** Un documento leído como JSON: un objeto, o `null` si no existe o no se entiende. */
export type SaveDocument = Record<string, unknown> | null;

/** Todos los documentos guardados, en una versión dada. */
export type SaveDocuments = Record<SaveDocumentName, SaveDocument>;

/** El texto crudo de cada documento, tal cual está en el disco (`null` si no existe). */
export type RawSave = Record<SaveDocumentName, string | null>;

/**
 * Paso de una versión a la siguiente. Recibe los documentos de la versión `from` y
 * devuelve los de la versión `to`. Tiene que tolerar que algún documento ya esté en la
 * versión nueva: pasa si una migración anterior se cortó a mitad de camino.
 */
export interface SaveMigration {
  from: number;
  to: number;
  migrate: (documents: SaveDocuments) => SaveDocuments;
}

/** Un documento para escribir en el disco. */
export interface SaveWrite {
  document: SaveDocumentName;
  json: string;
}

export interface SaveMigrationResult {
  /** Versión de los datos que había en el disco; `null` si no había nada guardado. */
  fromVersion: number | null;
  /** Texto de cada documento ya migrado, listo para leer. */
  documents: RawSave;
  /**
   * Lo que hay que escribir, en orden. Si la escritura se corta, la próxima migración
   * la completa sin perder datos.
   */
  writes: SaveWrite[];
}
