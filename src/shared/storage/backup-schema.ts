import { z } from 'zod'

import { SESSION_STAGES } from '@/shared/types'
import type { ResumeSession, StyleSheet } from '@/shared/types'

/**
 * Zod schemas and types for the backup file.
 *
 * A backup is one JSON file holding every saved session and style. It is
 * validated in two steps. First the loose envelope is checked, so the version
 * can be read and older files can be migrated. Then the migrated data is
 * checked against the full backup schema before anything is written to
 * storage.
 */

/** Marker written into every backup so other JSON files are rejected early. */
export const BACKUP_FORMAT = 'resume-builder-backup'

/**
 * Version of the backup file layout. Increase it whenever the envelope or the
 * shape of the stored records changes, and add a step to the migration chain.
 */
export const CURRENT_BACKUP_VERSION = 1

/** The first backup version that was ever written. */
export const FIRST_BACKUP_VERSION = 1

/** Fields every stored record carries, as checked on import. */
const storedRecordShape = {
  id: z.string().min(1, 'must not be empty'),
  schemaVersion: z.number().int().nonnegative(),
  createdAt: z.string().min(1, 'must not be empty'),
  updatedAt: z.string().min(1, 'must not be empty'),
}

/** Matches one of the known session stages. */
const sessionStageSchema = z
  .string()
  .refine((value) => (SESSION_STAGES as readonly string[]).includes(value), {
    message: `must be one of: ${SESSION_STAGES.join(', ')}`,
  })

/**
 * One saved resume session. The core fields are checked here. Any other
 * fields are kept as they are, so sessions written by the app round-trip
 * without losing data.
 */
export const backupSessionSchema = z
  .object({
    ...storedRecordShape,
    stage: sessionStageSchema,
  })
  .passthrough()

/** One saved style: a name and the CSS text, plus the stored record fields. */
export const backupStyleSchema = z
  .object({
    ...storedRecordShape,
    name: z.string().min(1, 'must not be empty'),
    css: z.string(),
  })
  .passthrough()

/** Adds an issue for every id that appears more than once in a list. */
function addDuplicateIdIssues(
  records: ReadonlyArray<{ id: string }>,
  key: 'sessions' | 'styles',
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>()
  records.forEach((record, index) => {
    if (seen.has(record.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key, index, 'id'],
        message: `duplicates an earlier ${key === 'sessions' ? 'session' : 'style'} id ("${record.id}")`,
      })
    }
    seen.add(record.id)
  })
}

/**
 * The loose envelope of a backup, used before migration. It only requires the
 * format marker and a backup version, and keeps everything else untouched so
 * the migration chain can reshape it.
 */
export const backupEnvelopeSchema = z
  .object({
    format: z.literal(BACKUP_FORMAT, {
      errorMap: () => ({
        message: `must be "${BACKUP_FORMAT}" (this file does not look like a Resume Builder backup)`,
      }),
    }),
    backupVersion: z
      .number({ invalid_type_error: 'must be a number' })
      .int('must be a whole number')
      .min(FIRST_BACKUP_VERSION, `must be ${FIRST_BACKUP_VERSION} or higher`),
  })
  .passthrough()

/** The loose envelope of a backup, as read from a file. */
export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>

/** A complete backup at the current version. */
export interface BackupFile {
  /** Always the backup format marker. */
  format: typeof BACKUP_FORMAT
  /** Version of the backup file layout. */
  backupVersion: number
  /** When the backup was created, as an ISO 8601 timestamp. */
  exportedAt: string
  /** Every saved resume session. */
  sessions: ResumeSession[]
  /** Every saved style. */
  styles: StyleSheet[]
}

const backupFileObjectSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  backupVersion: z.literal(CURRENT_BACKUP_VERSION, {
    errorMap: () => ({
      message: `must be ${CURRENT_BACKUP_VERSION} once the file has been migrated`,
    }),
  }),
  exportedAt: z.string().min(1, 'must not be empty'),
  sessions: z.array(backupSessionSchema),
  styles: z.array(backupStyleSchema),
})

/**
 * The full backup schema, applied after migration. The record schemas check
 * the core fields and keep the rest, so the parsed value is typed as the
 * app's own session and style types.
 */
export const backupFileSchema = backupFileObjectSchema.superRefine(
  (backup, ctx) => {
    addDuplicateIdIssues(backup.sessions, 'sessions', ctx)
    addDuplicateIdIssues(backup.styles, 'styles', ctx)
  },
) as unknown as z.ZodType<BackupFile>

/** A short summary of what a backup contains, shown before importing. */
export interface BackupSummary {
  /** Number of sessions in the backup. */
  sessionCount: number
  /** Number of styles in the backup. */
  styleCount: number
  /** When the backup was created. */
  exportedAt: string
}

/** Summarizes a validated backup for the import confirmation. */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  return {
    sessionCount: backup.sessions.length,
    styleCount: backup.styles.length,
    exportedAt: backup.exportedAt,
  }
}