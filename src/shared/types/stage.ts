/**
 * The stages a resume session moves through, in order.
 *
 * - jobContext: the user enters the job details.
 * - checklistSetup: the AI produces the checklist of required information.
 * - questionLoop: the AI asks questions and updates the checklist.
 * - finalHtml: the AI produces the final unstyled resume HTML.
 * - complete: the resume HTML has been saved and is ready to render.
 */
export const SessionStage = {
  JobContext: 'jobContext',
  ChecklistSetup: 'checklistSetup',
  QuestionLoop: 'questionLoop',
  FinalHtml: 'finalHtml',
  Complete: 'complete',
} as const

export type SessionStage = (typeof SessionStage)[keyof typeof SessionStage]

/** All stages in the order a session progresses through them. */
export const SESSION_STAGES: readonly SessionStage[] = [
  SessionStage.JobContext,
  SessionStage.ChecklistSetup,
  SessionStage.QuestionLoop,
  SessionStage.FinalHtml,
  SessionStage.Complete,
] as const