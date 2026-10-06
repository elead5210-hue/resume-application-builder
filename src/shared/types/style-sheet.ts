import type { StoredRecord } from './common'

/**
 * A saved CSS style that can be applied to any saved resume HTML.
 *
 * The CSS targets the shared selector contract, so any style can be
 * combined with any resume. The id, schemaVersion, createdAt and updatedAt
 * fields are inherited from StoredRecord.
 */
export interface StyleSheet extends StoredRecord {
  /** Human-readable name shown in the style picker. */
  name: string
  /** The raw CSS text for the style. */
  css: string
}