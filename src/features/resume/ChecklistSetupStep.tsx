import { useMemo } from 'react'

import {
  CHECKLIST_JSON_SCHEMA,
  STAGE_TEMPLATES,
  buildPrompt,
  checklistResponseSchema,
} from '@/shared/prompting'
import type { ChecklistResponse } from '@/shared/prompting'
import { PromptStep } from '@/shared/ui/PromptStep'

interface ChecklistSetupStepProps {
  /** The job details saved to the session in the job context step. */
  jobContext: string
  /**
   * Called with the validated checklist when the user saves the pasted
   * response. The parent stores it on the session as the source of truth for
   * the question loop.
   */
  onSave: (checklist: ChecklistResponse) => void
}

/**
 * Checklist setup stage: builds the setup prompt from the job context and the
 * checklist schema, shows it in the shared PromptStep, and hands the
 * validated checklist to the parent once the user saves it.
 */
export default function ChecklistSetupStep({
  jobContext,
  onSave,
}: ChecklistSetupStepProps) {
  const prompt = useMemo(
    () =>
      buildPrompt({
        instruction: STAGE_TEMPLATES.checklistSetup.instruction,
        context: jobContext,
        schema: CHECKLIST_JSON_SCHEMA,
      }),
    [jobContext],
  )

  return (
    <PromptStep
      title="Checklist setup"
      prompt={prompt}
      schema={checklistResponseSchema}
      onSave={onSave}
      saveLabel="Save checklist"
    />
  )
}