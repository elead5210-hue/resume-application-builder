import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { ResumeSession, StyleSheet } from '@/shared/types'

/** Name of the IndexedDB database used by the app. */
export const DB_NAME = 'resume-builder'

/**
 * Version of the IndexedDB database structure (object stores and indexes).
 * This is separate from the schemaVersion stamped on each record: bump this
 * when stores or indexes change, and add a matching upgrade step below.
 */
export const DB_VERSION = 1

/** Names of the object stores in the database. */
export const STORE_NAMES = {
  sessions: 'sessions',
  styles: 'styles',
} as const

/** Typed schema describing every object store and its indexes. */
export interface ResumeBuilderDB extends DBSchema {
  sessions: {
    key: string
    value: ResumeSession
    indexes: { 'by-updatedAt': string }
  }
  styles: {
    key: string
    value: StyleSheet
    indexes: { 'by-updatedAt': string }
  }
}

export type ResumeBuilderDatabase = IDBPDatabase<ResumeBuilderDB>

let dbPromise: Promise<ResumeBuilderDatabase> | null = null

/**
 * Open (or create) the database. The connection is created once and reused,
 * and a failed attempt is cleared so the next call can retry.
 */
export function getDb(): Promise<ResumeBuilderDatabase> {
  if (!dbPromise) {
    dbPromise = openDB<ResumeBuilderDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Each step runs only for databases older than that version, so
        // future versions can be added as further `if` blocks.
        if (oldVersion < 1) {
          const sessions = db.createObjectStore(STORE_NAMES.sessions, {
            keyPath: 'id',
          })
          sessions.createIndex('by-updatedAt', 'updatedAt')

          const styles = db.createObjectStore(STORE_NAMES.styles, {
            keyPath: 'id',
          })
          styles.createIndex('by-updatedAt', 'updatedAt')
        }
      },
      terminated() {
        dbPromise = null
      },
    }).catch((error: unknown) => {
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}