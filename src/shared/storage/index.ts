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
export type { NewSessionInput, NewStyleInput, StorageState } from './store'

export { default as StorageProvider } from './StorageProvider'