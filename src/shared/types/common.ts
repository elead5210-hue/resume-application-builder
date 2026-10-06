/**
 * Current schema version stamped on every stored record.
 * Bump this when the shape of a persisted record changes so that
 * import and migration code can detect older data.
 */
export const SCHEMA_VERSION = 1

export type SchemaVersion = typeof SCHEMA_VERSION

/** ISO 8601 timestamp string, e.g. "2026-10-06T09:30:00.000Z". */
export type IsoTimestamp = string

/**
 * Base shape shared by every record persisted to storage.
 */
export interface StoredRecord {
  id: string
  schemaVersion: number
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}