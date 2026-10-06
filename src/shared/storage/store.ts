import { create } from 'zustand'
import { SCHEMA_VERSION, SessionStage } from '@/shared/types'
import type { ResumeSession, StyleSheet } from '@/shared/types'
import {
  deleteSession,
  listSessions,
  saveSession,
} from './sessions-repository'
import { deleteStyle, listStyles, saveStyle } from './styles-repository'

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
  removeStyle: (id: string) => Promise<void>
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
}))