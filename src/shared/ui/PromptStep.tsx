import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ZodType } from 'zod'

import { parseResponse } from '@/shared/prompting'

interface PromptStepProps<T> {
  /** The generated prompt the user copies into their AI of choice. */
  prompt: string
  /** The zod schema the pasted response must satisfy. */
  schema: ZodType<T>
  /** Called with the validated data when the user presses the save button. */
  onSave: (data: T) => void
  /** Optional heading shown above the step. */
  title?: string
  /** Optional custom preview of the parsed response. Defaults to formatted JSON. */
  renderPreview?: (data: T) => ReactNode
  /** Label of the save button. */
  saveLabel?: string
  /** Optional short text explaining the copy-and-paste step. */
  helperText?: ReactNode
}

type CopyStatus = 'idle' | 'copied' | 'failed'

/**
 * Reusable copy-paste step: shows the generated prompt with a copy button,
 * provides a paste area for the AI response, validates the pasted text, shows
 * errors or a parsed preview, and offers a save button once the response is
 * valid.
 */
export function PromptStep<T>({
  prompt,
  schema,
  onSave,
  title,
  renderPreview,
  saveLabel = 'Save response',
  helperText,
}: PromptStepProps<T>) {
  const promptId = useId()
  const responseId = useId()
  const [pasted, setPasted] = useState('')
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const helperId = useId()
  const errorsId = useId()
  const errorsRef = useRef<HTMLUListElement>(null)
  // Set when the user pastes, so focus only moves to the errors after a paste
  // and never while they are typing.
  const shouldFocusErrors = useRef(false)

  const result = useMemo(
    () => (pasted.trim() === '' ? null : parseResponse(pasted, schema)),
    [pasted, schema],
  )

  // When a pasted response fails validation, move focus to the error list so
  // keyboard and screen reader users hear what went wrong.
  useEffect(() => {
    if (result === null) {
      shouldFocusErrors.current = false
      return
    }
    if (!result.ok && shouldFocusErrors.current) {
      errorsRef.current?.focus()
    }
    shouldFocusErrors.current = false
  }, [result])

  const hasErrors = result !== null && !result.ok
  const describedBy =
    [helperText ? helperId : null, hasErrors ? errorsId : null]
      .filter(Boolean)
      .join(' ') || undefined

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  function handleSave() {
    if (result !== null && result.ok) {
      onSave(result.data)
    }
  }

  return (
    <section className="prompt-step">
      {title ? <h2 className="prompt-step__title">{title}</h2> : null}

      {helperText ? (
        <div id={helperId} className="prompt-step__helper">
          {helperText}
        </div>
      ) : null}

      <div className="prompt-step__prompt">
        <label className="prompt-step__label" htmlFor={promptId}>
          Prompt to copy into your AI
        </label>
        <textarea
          id={promptId}
          className="prompt-step__prompt-text"
          value={prompt}
          readOnly
          rows={10}
        />
        <div className="prompt-step__actions">
          <button
            type="button"
            className="prompt-step__copy"
            onClick={() => {
              void handleCopy()
            }}
          >
            Copy prompt
          </button>
          <span
            className="prompt-step__copy-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {copyStatus === 'copied' ? 'Copied to clipboard.' : null}
            {copyStatus === 'failed'
              ? 'Could not copy automatically. Select the text and copy it manually.'
              : null}
          </span>
        </div>
      </div>

      <div className="prompt-step__response">
        <label className="prompt-step__label" htmlFor={responseId}>
          Paste the AI response here
        </label>
        <textarea
          id={responseId}
          className="prompt-step__response-text"
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          onPaste={() => {
            shouldFocusErrors.current = true
          }}
          rows={10}
          spellCheck={false}
          aria-invalid={hasErrors}
          aria-describedby={describedBy}
        />
      </div>

      {result !== null && !result.ok ? (
        <ul
          id={errorsId}
          ref={errorsRef}
          className="prompt-step__errors"
          role="alert"
          tabIndex={-1}
        >
          {result.errors.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      ) : null}

      {result !== null && result.ok ? (
        <div className="prompt-step__preview">
          <h3 className="prompt-step__preview-title">Parsed preview</h3>
          {renderPreview ? (
            renderPreview(result.data)
          ) : (
            <pre className="prompt-step__preview-json">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      ) : null}

      <div className="prompt-step__actions">
        <button
          type="button"
          className="prompt-step__save"
          onClick={handleSave}
          disabled={result === null || !result.ok}
        >
          {saveLabel}
        </button>
      </div>
    </section>
  )
}