import { SCHEMA_VERSION } from '@/shared/types'
import type { ResumeSession } from '@/shared/types'
import { getDb, STORE_NAMES } from './db'

/** Fetch a single session by id, or undefined if it does not exist. */
export async function getSession(
  id: string,
): Promise<ResumeSession | undefined> {
  const db = await getDb()
  return db.get(STORE_NAMES.sessions, id)
}

/**
 * Save a session, stamping the current schemaVersion and a fresh updatedAt.
 * Returns the record exactly as it was stored.
 */
export async function saveSession(
  session: ResumeSession,
): Promise<ResumeSession> {
  const record: ResumeSession = {
    ...session,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  }
  const db = await getDb()
  await db.put(STORE_NAMES.sessions, record)
  return record
}

/** List all sessions, most recently updated first. */
export async function listSessions(): Promise<ResumeSession[]> {
  const db = await getDb()
  const sessions = await db.getAllFromIndex(
    STORE_NAMES.sessions,
    'by-updatedAt',
  )
  return sessions.reverse()
}

/** Delete a session by id. Deleting a missing id is a no-op. */
export async function deleteSession(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAMES.sessions, id)
}