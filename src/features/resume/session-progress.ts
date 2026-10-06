import { SessionStage } from '@/shared/types'
import type { ResumeSession } from '@/shared/types'

/** Human-readable label for each session stage. */
export const STAGE_LABELS: Record<SessionStage, string> = {
  [SessionStage.JobContext]: 'Job details',
  [SessionStage.ChecklistSetup]: 'Checklist setup',
  [SessionStage.QuestionLoop]: 'Answering questions',
  [SessionStage.FinalHtml]: 'Final resume',
  [SessionStage.Complete]: 'Complete',
}

/** Return the display label for a stage. */
export function getStageLabel(stage: SessionStage): string {
  return STAGE_LABELS[stage]
}

/**
 * Progress share (0 to 100) reached when a stage begins. The question loop
 * occupies the 30 to 85 band and is filled in by checklist completion.
 */
const STAGE_START_PERCENT: Record<SessionStage, number> = {
  [SessionStage.JobContext]: 0,
  [SessionStage.ChecklistSetup]: 10,
  [SessionStage.QuestionLoop]: 30,
  [SessionStage.FinalHtml]: 85,
  [SessionStage.Complete]: 100,
}

const QUESTION_LOOP_END_PERCENT = 85

/**
 * Calculate overall progress for a session as a whole number from 0 to 100.
 *
 * Earlier stages map to fixed values. During the question loop, progress
 * grows with the share of checklist items marked complete.
 */
export function getSessionProgress(session: ResumeSession): number {
  const start = STAGE_START_PERCENT[session.stage]

  if (session.stage === SessionStage.QuestionLoop && session.checklist) {
    const items = session.checklist.items
    if (items.length > 0) {
      const completed = items.filter((item) => item.status === 'complete')
        .length
      const fraction = completed / items.length
      return Math.round(
        start + fraction * (QUESTION_LOOP_END_PERCENT - start),
      )
    }
  }

  return start
}