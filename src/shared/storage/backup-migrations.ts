import { SCHEMA_VERSION } from '@/shared/types'

import { CURRENT_BACKUP_VERSION, FIRST_BACKUP_VERSION } from './backup-schema'

/**
 * Pure migration chain for imported backups.
 *
 * Two kinds of version are upgraded here, both before the backup is checked
 * against the full schema:
 *
 * - The backup version: the layout of the backup file itself.
 * - The record schema version: the shape of each stored session and style.
 *
 * Each migration upgrades its input by exactly one version, and the chain
 * applies them in order until the current version is reached. To change a
 * shape later, increase the current version and register one step under the
 * version it upgrades from. Migrations never modify their input.
 */

/** Upgrades a whole backup from one backup version to the next. */
export type BackupMigration = (
  backup: Record<string, unknown>,
) => Record<string, unknown>

/** Upgrades one stored record from one schema version to the next. */
export type RecordMigration = (
  record: Record<string, unknown>,
) => Record<string, unknown>

/** The two kinds of records a backup holds. */
export type RecordKind = 'sessions' | 'styles'

/**
 * Backup migrations, keyed by the backup version they upgrade from. Backup
 * version 1 is the current version, so no steps exist yet.
 */
export const BACKUP_MIGRATIONS: Readonly<Record<number, BackupMigration>> = {}

/**
 * Record migrations, keyed by record kind and then by the schema version they
 * upgrade from. Nothing has been upgraded yet, so every list is empty.
 */
export const RECORD_MIGRATIONS: Readonly<
  Record<RecordKind, Readonly<Record<number, RecordMigration>>>
> = {
  sessions: {},
  styles: {},
}

/** The most record errors listed before the rest are summarized. */
const MAX_LISTED_ERRORS = 10

/** A backup that was upgraded to the current versions. */
export interface MigrateBackupSuccess {
  ok: true
  /** The upgraded backup, ready for schema validation. */
  data: Record<string, unknown>
  /** The backup version the file was written with. */
  fromBackupVersion: number
  /** True when any backup or record migration step was applied. */
  migrated: boolean
}

/** A backup that could not be upgraded, with one message per problem. */
export interface MigrateBackupFailure {
  ok: false
  errors: string[]
}

/** The outcome of migrating a backup. */
export type MigrateBackupResult = MigrateBackupSuccess | MigrateBackupFailure

/** True for a non-null object that is not an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The readable name of a record kind, used in messages. */
function kindLabel(kind: RecordKind): string {
  return kind === 'sessions' ? 'session' : 'style'
}

/**
 * Upgrades one record to the current schema version. Returns the record, or a
 * message when it cannot be upgraded. A record without a usable schema version
 * is passed through so schema validation reports it.
 */
function migrateRecord(
  record: unknown,
  kind: RecordKind,
  index: number,
): { record: unknown; changed: boolean } | { error: string } {
  if (!isPlainObject(record)) {
    return { record, changed: false }
  }

  const where = `${kind}[${index}]`
  let version = record.schemaVersion

  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { record, changed: false }
  }

  if (version > SCHEMA_VERSION) {
    return {
      error: `${where}: this ${kindLabel(kind)} uses data version ${version}, which is newer than this app understands (${SCHEMA_VERSION}). Update the app and try again.`,
    }
  }

  let current: Record<string, unknown> = record
  let changed = false

  while (version < SCHEMA_VERSION) {
    const step = RECORD_MIGRATIONS[kind][version]
    if (step === undefined) {
      return {
        error: `${where}: this ${kindLabel(kind)} uses data version ${version}, and there is no way to upgrade it to version ${SCHEMA_VERSION}.`,
      }
    }
    current = { ...step(current), schemaVersion: version + 1 }
    version += 1
    changed = true
  }

  return { record: current, changed }
}

/**
 * Upgrades every record in a list. Anything that is not a list is passed
 * through so schema validation reports it.
 */
function migrateRecords(
  records: unknown,
  kind: RecordKind,
  errors: string[],
): { records: unknown; changed: boolean } {
  if (!Array.isArray(records)) {
    return { records, changed: false }
  }

  let changed = false
  const upgraded = records.map((record, index) => {
    const result = migrateRecord(record, kind, index)
    if ('error' in result) {
      errors.push(result.error)
      return record
    }
    changed = changed || result.changed
    return result.record
  })

  return { records: upgraded, changed }
}

/** Trims a long list of errors and notes how many were left out. */
function limitErrors(errors: string[]): string[] {
  if (errors.length <= MAX_LISTED_ERRORS) {
    return errors
  }
  const hidden = errors.length - MAX_LISTED_ERRORS
  return [
    ...errors.slice(0, MAX_LISTED_ERRORS),
    `${hidden} more ${hidden === 1 ? 'problem was' : 'problems were'} found.`,
  ]
}

/**
 * Upgrades a parsed backup to the current backup version and upgrades every
 * stored session and style to the current record schema version.
 *
 * The result is not yet validated against the full backup schema. Pass the
 * returned data to that schema next. The input is never modified.
 */
export function migrateBackup(raw: unknown): MigrateBackupResult {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      errors: ['The backup file must contain a JSON object.'],
    }
  }

  const fromBackupVersion = raw.backupVersion

  if (
    typeof fromBackupVersion !== 'number' ||
    !Number.isInteger(fromBackupVersion)
  ) {
    return {
      ok: false,
      errors: ['The backup file has no valid backupVersion number.'],
    }
  }

  if (fromBackupVersion < FIRST_BACKUP_VERSION) {
    return {
      ok: false,
      errors: [
        `Backup version ${fromBackupVersion} is not valid. The first version is ${FIRST_BACKUP_VERSION}.`,
      ],
    }
  }

  if (fromBackupVersion > CURRENT_BACKUP_VERSION) {
    return {
      ok: false,
      errors: [
        `This backup was made with a newer version of the app (backup version ${fromBackupVersion}). This app understands up to version ${CURRENT_BACKUP_VERSION}. Update the app and try again.`,
      ],
    }
  }

  let data: Record<string, unknown> = { ...raw }
  let version = fromBackupVersion
  let migrated = false

  while (version < CURRENT_BACKUP_VERSION) {
    const step = BACKUP_MIGRATIONS[version]
    if (step === undefined) {
      return {
        ok: false,
        errors: [
          `Backup version ${version} cannot be upgraded to version ${CURRENT_BACKUP_VERSION}.`,
        ],
      }
    }
    data = { ...step(data), backupVersion: version + 1 }
    version += 1
    migrated = true
  }

  const errors: string[] = []

  const sessions = migrateRecords(data.sessions, 'sessions', errors)
  const styles = migrateRecords(data.styles, 'styles', errors)

  if (errors.length > 0) {
    return { ok: false, errors: limitErrors(errors) }
  }

  if (sessions.changed) {
    data = { ...data, sessions: sessions.records }
    migrated = true
  }

  if (styles.changed) {
    data = { ...data, styles: styles.records }
    migrated = true
  }

  return { ok: true, data, fromBackupVersion, migrated }
}