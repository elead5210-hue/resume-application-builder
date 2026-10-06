import { useId, useState } from 'react'
import type { FormEvent } from 'react'

interface JobContextStepProps {
  /** The job details already saved to the session, if any. */
  initialValue?: string
  /**
   * Called with the trimmed job details when the user asks for the next
   * prompt. The parent saves the text to the session and moves on.
   */
  onSubmit: (jobContext: string) => void
}

/**
 * Job description step: a textarea for the job details (role, company,
 * description, requirements) and a button underneath that saves the text and
 * generates the next prompt.
 */
export default function JobContextStep({
  initialValue = '',
  onSubmit,
}: JobContextStepProps) {
  const textareaId = useId()
  const hintId = useId()
  const [draft, setDraft] = useState(initialValue)

  const trimmed = draft.trim()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (trimmed === '') {
      return
    }
    onSubmit(trimmed)
  }

  return (
    <form className="job-context-step" onSubmit={handleSubmit}>
      <label className="job-context-step__label" htmlFor={textareaId}>
        Job details
      </label>
      <p className="job-context-step__hint" id={hintId}>
        Paste the role, company, description and requirements of the job you
        are applying for.
      </p>
      <textarea
        id={textareaId}
        className="app-textarea job-context-step__textarea"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={14}
        aria-describedby={hintId}
      />
      <div className="app-actions job-context-step__actions">
        <button
          type="submit"
          className="app-button job-context-step__submit"
          disabled={trimmed === ''}
        >
          Generate next prompt
        </button>
      </div>
    </form>
  )
}