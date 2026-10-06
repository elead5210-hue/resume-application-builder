import { useMemo, useState } from 'react'

import {
  FINAL_HTML_JSON_SCHEMA,
  STAGE_TEMPLATES,
  buildFinalContext,
  buildPrompt,
  finalHtmlResponseSchema,
  sanitizeResumeHtml,
} from '@/shared/prompting'
import type {
  ChecklistResponse,
  FinalHtmlResponse,
  SanitizeHtmlResult,
} from '@/shared/prompting'
import { PromptStep } from '@/shared/ui/PromptStep'

import type { AnsweredQuestion } from './QuestionLoopStep'
import SanitizedHtmlPreview from './SanitizedHtmlPreview'

interface FinalHtmlStepProps {
  /** The job details saved to the session. */
  jobContext: string
  /** The final checklist, with the status of every item. */
  checklist: ChecklistResponse
  /** The full question and answer history, oldest first. */
  answers: ReadonlyArray<AnsweredQuestion>
  /** Called with the cleaned HTML once the user confirms it in the preview. */
  onSave: (html: string) => void
}

/**
 * Final HTML stage: builds the final prompt from the job context, the full
 * question and answer history and the checklist, shows it in the shared
 * PromptStep, and sanitizes the pasted HTML. The cleaned result is shown in a
 * preview with its warnings, and only the cleaned HTML is handed to the
 * parent to save once the user confirms it.
 */
export default function FinalHtmlStep({
  jobContext,
  checklist,
  answers,
  onSave,
}: FinalHtmlStepProps) {
  const [sanitized, setSanitized] = useState<SanitizeHtmlResult | null>(null)

  const prompt = useMemo(
    () =>
      buildPrompt({
        instruction: STAGE_TEMPLATES.finalHtml.instruction,
        context: buildFinalContext({
          jobContext,
          checklist,
          qaHistory: answers,
        }),
        schema: FINAL_HTML_JSON_SCHEMA,
      }),
    [jobContext, checklist, answers],
  )

  function handleResponseSave(response: FinalHtmlResponse) {
    setSanitized(sanitizeResumeHtml(response.html))
  }

  function handleConfirm() {
    if (sanitized !== null) {
      onSave(sanitized.html)
    }
  }

  function handleDiscard() {
    setSanitized(null)
  }

  if (sanitized !== null) {
    return (
      <div>
        <SanitizedHtmlPreview
          html={sanitized.html}
          warnings={sanitized.warnings}
        />
        <div className="app-actions">
          <button
            type="button"
            className="app-button"
            onClick={handleConfirm}
            disabled={sanitized.html.trim() === ''}
          >
            Save cleaned HTML
          </button>
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={handleDiscard}
          >
            Paste a different response
          </button>
        </div>
      </div>
    )
  }

  return (
    <PromptStep
      title="Final resume HTML"
      prompt={prompt}
      schema={finalHtmlResponseSchema}
      onSave={handleResponseSave}
    />
  )
}