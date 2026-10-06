/**
 * A single question returned by the AI during the question loop.
 */
export interface Question {
  id: string
  text: string
  /** Optional id of the checklist item this question is meant to satisfy. */
  checklistItemId?: string
}

/**
 * A question paired with the user's answer, recorded in the session's
 * Q&A history and passed back to the AI on later rounds.
 */
export interface QAEntry {
  question: Question
  /** The user's answer. An empty string means not yet answered. */
  answer: string
  /** ISO 8601 timestamp of when the answer was saved. */
  answeredAt?: string
}