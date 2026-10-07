/**
 * Storage module entry point.
 *
 * Typed IndexedDB persistence for resume sessions and styles, exposed
 * through a Zustand store and a provider that hydrates it on startup.
 */
export { DB_NAME, DB_VERSION, STORE_NAMES, getDb } from './db'
export type { ResumeBuilderDB, ResumeBuilderDatabase } from './db'

export {
  deleteSession,
  getSession,
  listSessions,
  saveSession,
} from './sessions-repository'
export {
  deleteStyle,
  getStyle,
  listStyles,
  saveStyle,
} from './styles-repository'

export { useStorageStore } from './store'
export type {
  ImportBackupResult,
  NewSessionInput,
  NewStyleInput,
  StorageState,
} from './store'

export {
  buildBackup,
  getBackupFileName,
  parseBackup,
  serializeBackup,
} from './backup'
export type {
  ParseBackupFailure,
  ParseBackupResult,
  ParseBackupSuccess,
} from './backup'

export {
  BACKUP_FORMAT,
  CURRENT_BACKUP_VERSION,
  FIRST_BACKUP_VERSION,
  backupFileSchema,
  summarizeBackup,
} from './backup-schema'
export type { BackupFile, BackupSummary } from './backup-schema'

export { migrateBackup } from './backup-migrations'
export type { MigrateBackupResult } from './backup-migrations'

export { default as StorageProvider } from './StorageProvider'