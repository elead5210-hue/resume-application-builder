/**
 * Status of a single checklist item.
 *
 * An item can only move to "complete" when the AI is satisfied with the
 * user's answers. Until then it stays "pending" or "in_progress".
 */
export type ChecklistItemStatus = 'pending' | 'in_progress' | 'complete'

/** All valid checklist item statuses, in progression order. */
export const CHECKLIST_ITEM_STATUSES: readonly ChecklistItemStatus[] = [
  'pending',
  'in_progress',
  'complete',
] as const

/**
 * One checkpoint of information that must be captured before the resume
 * can be generated (for example work history or skills).
 */
export interface ChecklistItem {
  id: string
  label: string
  status: ChecklistItemStatus
  /** AI-authored notes about what has been captured or is still missing. */
  notes: string
}

/**
 * The checklist generated during setup and passed back to the AI on every
 * round of the question loop. It is the source of truth for progress.
 */
export interface Checklist {
  items: ChecklistItem[]
}