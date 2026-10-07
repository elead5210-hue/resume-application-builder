import type { ZodIssue } from 'zod'

import type { ResumeSession, StyleSheet } from '@/shared/types'

import { migrateBackup } from './backup-migrations'
import {
  BACKUP_FORMAT,
  CURRENT_BACKUP_VERSION,
  backupEnvelopeSchema,
  backupFileSchema,
  summarizeBackup,
} from './backup-schema'
import type { BackupFile, BackupSummary } from './backup-schema'

/**
 * Pure helpers for exporting and importing a backup.
 *
 * Exporting builds a backup object from the saved sessions and styles and
 * serializes it to JSON. Importing takes the text of a chosen file, parses it,
 * upgrades older versions and validates the result, returning clear messages
 * when anything is wrong. Nothing here touches storage, the DOM or the clock
 * unless a date is passed in, so every helper is easy to test.
 */

/** The most problems listed before the rest are summarized. */
const MAX_LISTED_ERRORS = 10

/** A backup that was parsed, upgraded and validated. */
export interface ParseBackupSuccess {
  ok: true
  /** The validated backup at the current version. */
  backup: BackupFile
  /** Counts and export time, for the import confirmation. */
  summary: BackupSummary
  /** The backup version the file was written with. */
  fromBackupVersion: number
  /** True when the file was written by an older version and was upgraded. */
  migrated: boolean
}

/** A backup that could not be imported, with one message per problem. */
export interface ParseBackupFailure {
  ok: false
  errors: string[]
}

/** The outcome of parsing an imported backup file. */
export type ParseBackupResult = ParseBackupSuccess | ParseBackupFailure

/**
 * Builds a backup of the given sessions and styles. The lists are copied, so
 * later changes to the originals do not alter the backup.
 */
export function buildBackup(
  sessions: readonly ResumeSession[],
  styles: readonly StyleSheet[],
  exportedAt: Date = new Date(),
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    backupVersion: CURRENT_BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    sessions: [...sessions],
    styles: [...styles],
  }
}

/** Serializes a backup to readable JSON text for saving as a file. */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

/** Pads a number to two digits for use in a file name. */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/** Returns the file name used when downloading a backup, with a date stamp. */
export function getBackupFileName(exportedAt: Date = new Date()): string {
  const year = exportedAt.getFullYear()
  const month = twoDigits(exportedAt.getMonth() + 1)
  const day = twoDigits(exportedAt.getDate())
  return `resume-builder-backup-${year}-${month}-${day}.json`
}

/** Turns a zod issue path into a readable location such as sessions[2].stage. */
function formatPath(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) {
    return 'The backup file'
  }

  let location = ''
  for (const segment of path) {
    if (typeof segment === 'number') {
      location += `[${segment}]`
    } else {
      location += location === '' ? segment : `.${segment}`
    }
  }
  return location
}

/** Turns one zod issue into a single readable sentence. */
function formatIssue(issue: ZodIssue): string {
  const location = formatPath(issue.path)

  if (issue.code === 'invalid_type') {
    if (issue.received === 'undefined') {
      return `${location} is missing.`
    }
    return `${location} must be of type ${issue.expected}, but a ${issue.received} was found.`
  }

  const message = issue.message
  const startsLowercase = /^[a-z]/.test(message)
  const sentence = startsLowercase
    ? `${location} ${message}`
    : `${location}: ${message}`

  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
}

/** Formats a list of issues, removing repeats and trimming long lists. */
function formatIssues(issues: readonly ZodIssue[]): string[] {
  const messages: string[] = []
  for (const issue of issues) {
    const message = formatIssue(issue)
    if (!messages.includes(message)) {
      messages.push(message)
    }
  }

  if (messages.length <= MAX_LISTED_ERRORS) {
    return messages
  }

  const hidden = messages.length - MAX_LISTED_ERRORS
  return [
    ...messages.slice(0, MAX_LISTED_ERRORS),
    `${hidden} more ${hidden === 1 ? 'problem was' : 'problems were'} found.`,
  ]
}

/**
 * Parses the text of an imported backup file.
 *
 * The text is read as JSON, checked for the backup marker and version,
 * upgraded to the current versions and then validated against the full
 * backup schema. The first step that fails stops the import and returns
 * human-readable errors. Nothing is saved here.
 */
export function parseBackup(text: string): ParseBackupResult {
  const trimmed = text.replace(/^\uFEFF/, '').trim()

  if (trimmed === '') {
    return { ok: false, errors: ['The file is empty.'] }
  }

  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : ''
    return {
      ok: false,
      errors: [`The file is not valid JSON${detail}.`],
    }
  }

  const envelope = backupEnvelopeSchema.safeParse(raw)
  if (!envelope.success) {
    return { ok: false, errors: formatIssues(envelope.error.issues) }
  }

  const migration = migrateBackup(envelope.data)
  if (!migration.ok) {
    return { ok: false, errors: migration.errors }
  }

  const validated = backupFileSchema.safeParse(migration.data)
  if (!validated.success) {
    return { ok: false, errors: formatIssues(validated.error.issues) }
  }

  const backup = validated.data

  return {
    ok: true,
    backup,
    summary: summarizeBackup(backup),
    fromBackupVersion: migration.fromBackupVersion,
    migrated: migration.migrated,
  }
}