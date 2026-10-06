import type { LoopQaEntry } from './build-loop-context'
import type { ChecklistResponse } from './response-schemas'

/** The data the final HTML prompt is built from. */
export interface FinalContextInput {
  /** The job details saved to the session. */
  jobContext: string
  /** The final checklist, with the status of every item. */
  checklist: ChecklistResponse
  /** The full question and answer history, oldest first. */
  qaHistory: ReadonlyArray<LoopQaEntry>
}

/**
 * Serializes the job context, the full Q&A history and the checklist into
 * the context text passed to buildPrompt for the final HTML stage.
 *
 * This function is pure: the same input always produces the same output and
 * nothing outside the function is read or changed.
 */
export function buildFinalContext(input: FinalContextInput): string {
  const { jobContext, checklist, qaHistory } = input

  const checklistText = JSON.stringify(checklist, null, 2)

  const qaText =
    qaHistory.length === 0
      ? 'No questions were asked.'
      : qaHistory
          .map(
            (entry, index) =>
              `${index + 1}. Question: ${entry.question.text}\n   Answer: ${entry.answer}`,
          )
          .join('\n')

  return [
    '### Job context',
    jobContext,
    '### Checklist',
    checklistText,
    '### Full questions and answers',
    qaText,
  ].join('\n\n')
}