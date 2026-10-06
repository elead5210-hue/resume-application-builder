import type { ChecklistResponse } from './response-schemas'

/** One question and the user's answer to it, as shown to the AI. */
export interface LoopQaEntry {
  question: { text: string }
  answer: string
}

/** The data the question loop prompt is built from. */
export interface LoopContextInput {
  /** The job details saved to the session. */
  jobContext: string
  /** The current checklist, with the status of every item. */
  checklist: ChecklistResponse
  /** The most recent questions and answers, oldest first. */
  recentQa: ReadonlyArray<LoopQaEntry>
}

/**
 * Serializes the job context, the current checklist and the recent Q&A into
 * the context text passed to buildPrompt for the question loop.
 *
 * This function is pure: the same input always produces the same output and
 * nothing outside the function is read or changed.
 */
export function buildLoopContext(input: LoopContextInput): string {
  const { jobContext, checklist, recentQa } = input

  const checklistText = JSON.stringify(checklist, null, 2)

  const qaText =
    recentQa.length === 0
      ? 'No questions have been asked yet.'
      : recentQa
          .map(
            (entry, index) =>
              `${index + 1}. Question: ${entry.question.text}\n   Answer: ${entry.answer}`,
          )
          .join('\n')

  return [
    '### Job context',
    jobContext,
    '### Current checklist',
    checklistText,
    '### Recent questions and answers',
    qaText,
  ].join('\n\n')
}