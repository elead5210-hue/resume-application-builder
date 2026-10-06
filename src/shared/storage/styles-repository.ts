import { SCHEMA_VERSION } from '@/shared/types'
import type { StyleSheet } from '@/shared/types'
import { getDb, STORE_NAMES } from './db'

/** Fetch a single style by id, or undefined if it does not exist. */
export async function getStyle(id: string): Promise<StyleSheet | undefined> {
  const db = await getDb()
  return db.get(STORE_NAMES.styles, id)
}

/**
 * Save a style, stamping the current schemaVersion and a fresh updatedAt.
 * Returns the record exactly as it was stored.
 */
export async function saveStyle(style: StyleSheet): Promise<StyleSheet> {
  const record: StyleSheet = {
    ...style,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  }
  const db = await getDb()
  await db.put(STORE_NAMES.styles, record)
  return record
}

/** List all styles, most recently updated first. */
export async function listStyles(): Promise<StyleSheet[]> {
  const db = await getDb()
  const styles = await db.getAllFromIndex(STORE_NAMES.styles, 'by-updatedAt')
  return styles.reverse()
}

/** Delete a style by id. Deleting a missing id is a no-op. */
export async function deleteStyle(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAMES.styles, id)
}