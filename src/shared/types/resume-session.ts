import type { Checklist } from './checklist'
import type { StoredRecord } from './common'
import type { QAEntry, Question } from './question'
import type { SessionStage } from './stage'

/**
 * A single resume-building session for one job application.
 *
 * The session is persisted after every change so that a page refresh never
 * loses progress.
 */
export interface ResumeSession extends StoredRecord {
  /** Short human-readable title, for example the role and company. */
  title: string
  /** The job details pasted in by the user (role, company, description). */
  jobContext: string
  /** The stage the session is currently in. */
  stage: SessionStage
  /** The checklist produced during setup. Null until it has been saved. */
  checklist: Checklist | null
  /** Questions returned by the AI that have not been answered yet. */
  pendingQuestions: Question[]
  /** Every answered question, oldest first. */
  qaHistory: QAEntry[]
  /** The final unstyled resume HTML. Null until it has been saved. */
  finalHtml: string | null
}