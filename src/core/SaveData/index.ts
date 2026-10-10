export {
  getDocumentVersion,
  LEGACY_SAVE_VERSION,
  migrateSave,
  parseSaveDocument,
  SAVE_DOCUMENTS,
  SAVE_MIGRATIONS,
  SAVE_VERSION,
  serializeSaveDocument,
} from './SaveData';
export type {
  RawSave,
  SaveDocument,
  SaveDocumentName,
  SaveDocuments,
  SaveMigration,
  SaveMigrationResult,
  SaveWrite,
} from './SaveData.types';
