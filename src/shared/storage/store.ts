import { create } from 'zustand'
import { SCHEMA_VERSION, SessionStage } from '@/shared/types'
import type { ResumeSession, StyleSheet } from '@/shared/types'
import {
  deleteSession,
  listSessions,
  saveSession,
} from './sessions-repository'
import { deleteStyle, listStyles, saveStyle } from './styles-repository'
import type { BackupFile } from './backup-schema'

/** Data needed to start a new resume session. */
export interface NewSessionInput {
  title?: string
  jobContext?: string
}

/** Data needed to create a new style. */
export interface NewStyleInput {
  name: string
  css: string
}

/** The outcome of importing a backup into storage. */
export type ImportBackupResult =
  | { ok: true; sessionCount: number; styleCount: number }
  | { ok: false; error: string }

export interface StorageState {
  sessions: ResumeSession[]
  styles: StyleSheet[]
  /** True once the initial load from IndexedDB has finished. */
  hydrated: boolean
  /** True while the initial load is running. */
  loading: boolean
  /** Message from the most recent storage failure, or null. */
  error: string | null

  hydrate: () => Promise<void>

  createSession: (input?: NewSessionInput) => Promise<ResumeSession>
  updateSession: (
    id: string,
    changes: Partial<Omit<ResumeSession, 'id' | 'createdAt'>>,
  ) => Promise<ResumeSession | undefined>
  removeSession: (id: string) => Promise<void>

  createStyle: (input: NewStyleInput) => Promise<StyleSheet>
  updateStyle: (
    id: string,
    changes: Partial<Pick<StyleSheet, 'name' | 'css'>>,
  ) => Promise<StyleSheet | undefined>
  duplicateStyle: (id: string) => Promise<StyleSheet | undefined>
  removeStyle: (id: string) => Promise<void>

  /**
   * Saves every session and style from a validated backup. Records with an id
   * that already exists are replaced, and all others are added.
   */
  importBackup: (backup: BackupFile) => Promise<ImportBackupResult>
}

function newId(): string {
  return crypto.randomUUID()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Storage operation failed'
}

/** Replace a record by id, or add it, keeping the newest first. */
function upsertNewestFirst<T extends { id: string }>(
  items: T[],
  record: T,
): T[] {
  return [record, ...items.filter((item) => item.id !== record.id)]
}

/**
 * Add or replace several records by id, keeping the newest first. Records in
 * `records` win over existing items with the same id.
 */
function mergeNewestFirst<T extends { id: string; updatedAt: string }>(
  items: T[],
  records: T[],
): T[] {
  const incoming = new Set(records.map((record) => record.id))
  return [
    ...records,
    ...items.filter((item) => !incoming.has(item.id)),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

let hydratePromise: Promise<void> | null = null

export const useStorageStore = create<StorageState>()((set, get) => ({
  sessions: [],
  styles: [],
  hydrated: false,
  loading: false,
  error: null,

  hydrate: () => {
    if (get().hydrated) return Promise.resolve()
    if (hydratePromise) return hydratePromise
    set({ loading: true, error: null })
    hydratePromise = Promise.all([listSessions(), listStyles()])
      .then(([sessions, styles]) => {
        set({ sessions, styles, hydrated: true, loading: false })
      })
      .catch((error: unknown) => {
        set({ loading: false, error: errorMessage(error) })
      })
      .finally(() => {
        hydratePromise = null
      })
    return hydratePromise
  },

  createSession: async (input = {}) => {
    const now = new Date().toISOString()
    const session: ResumeSession = {
      id: newId(),
      schemaVersion: SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      title: input.title ?? 'Untitled resume',
      jobContext: input.jobContext ?? '',
      stage: SessionStage.JobContext,
      checklist: null,
      pendingQuestions: [],
      qaHistory: [],
      finalHtml: null,
    }
    // Update the UI immediately, then persist.
    set((state) => ({ sessions: upsertNewestFirst(state.sessions, session) }))
    try {
      const saved = await saveSession(session)
      set((state) => ({
        sessions: upsertNewestFirst(state.sessions, saved),
        error: null,
      }))
      return saved
    } catch (error) {
      set({ error: errorMessage(error) })
      return session
    }
  },

  updateSession: async (id, changes) => {
    const existing = get().sessions.find((session) => session.id === id)
    if (!existing) return undefined
    const updated: ResumeSession = { ...existing, ...changes, id }
    set((state) => ({ sessions: upsertNewestFirst(state.sessions, updated) }))
    try {
      const saved = await saveSession(updated)
      set((state) => ({
        sessions: upsertNewestFirst(state.sessions, saved),
        error: null,
      }))
      return saved
    } catch (error) {
      set({ error: errorMessage(error) })
      return updated
    }
  },

  removeSession: async (id) => {
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
    }))
    try {
      await deleteSession(id)
      set({ error: null })
    } catch (error) {
      set({ error: errorMessage(error) })
    }
  },

  createStyle: async (input) => {
    const now = new Date().toISOString()
    const style: StyleSheet = {
      id: newId(),
      schemaVersion: SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      name: input.name,
      css: input.css,
    }
    set((state) => ({ styles: upsertNewestFirst(state.styles, style) }))
    try {
      const saved = await saveStyle(style)
      set((state) => ({
        styles: upsertNewestFirst(state.styles, saved),
        error: null,
      }))
      return saved
    } catch (error) {
      set({ error: errorMessage(error) })
      return style
    }
  },

  updateStyle: async (id, changes) => {
    const existing = get().styles.find((style) => style.id === id)
    if (!existing) return undefined
    const updated: StyleSheet = { ...existing, ...changes, id }
    set((state) => ({ styles: upsertNewestFirst(state.styles, updated) }))
    try {
      const saved = await saveStyle(updated)
      set((state) => ({
        styles: upsertNewestFirst(state.styles, saved),
        error: null,
      }))
      return saved
    } catch (error) {
      set({ error: errorMessage(error) })
      return updated
    }
  },

  duplicateStyle: async (id) => {
    const existing = get().styles.find((style) => style.id === id)
    if (!existing) return undefined
    const now = new Date().toISOString()
    const copy: StyleSheet = {
      ...existing,
      id: newId(),
      schemaVersion: SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      name: `${existing.name} (copy)`,
    }
    set((state) => ({ styles: upsertNewestFirst(state.styles, copy) }))
    try {
      const saved = await saveStyle(copy)
      set((state) => ({
        styles: upsertNewestFirst(state.styles, saved),
        error: null,
      }))
      return saved
    } catch (error) {
      set({ error: errorMessage(error) })
      return copy
    }
  },

  removeStyle: async (id) => {
    set((state) => ({
      styles: state.styles.filter((style) => style.id !== id),
    }))
    try {
      await deleteStyle(id)
      set({ error: null })
    } catch (error) {
      set({ error: errorMessage(error) })
    }
  },

  importBackup: async (backup) => {
    try {
      const [savedSessions, savedStyles] = await Promise.all([
        Promise.all(backup.sessions.map((session) => saveSession(session))),
        Promise.all(backup.styles.map((style) => saveStyle(style))),
      ])
      set((state) => ({
        sessions: mergeNewestFirst(state.sessions, savedSessions),
        styles: mergeNewestFirst(state.styles, savedStyles),
        error: null,
      }))
      return {
        ok: true,
        sessionCount: savedSessions.length,
        styleCount: savedStyles.length,
      }
    } catch (error) {
      const message = errorMessage(error)
      set({ error: message })
      return { ok: false, error: message }
    }
  },
}))