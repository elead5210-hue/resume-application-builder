import { useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import {
  STAGE_TEMPLATES,
  STYLE_JSON_SCHEMA,
  buildPrompt,
  buildStyleContext,
  styleResponseSchema,
} from '@/shared/prompting'
import type { StyleResponse } from '@/shared/prompting'
import { useStorageStore } from '@/shared/storage'
import { PromptStep } from '@/shared/ui/PromptStep'

/**
 * Style generator step: the user describes the look they want, the app builds
 * the styling prompt from that description and the selector contract, and the
 * pasted response is validated and saved as a named style.
 */
export default function StyleGeneratorStep() {
  const textareaId = useId()
  const hintId = useId()
  const createStyle = useStorageStore((state) => state.createStyle)

  const [draft, setDraft] = useState('')
  const [lookDescription, setLookDescription] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const prompt = useMemo(() => {
    if (lookDescription === null) {
      return null
    }
    return buildPrompt({
      instruction: STAGE_TEMPLATES.styling.instruction,
      context: buildStyleContext({ lookDescription }),
      schema: STYLE_JSON_SCHEMA,
    })
  }, [lookDescription])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.trim() === '') {
      return
    }
    setLookDescription(draft.trim())
    setSavedName(null)
    setSaveError(null)
  }

  async function handleSave(style: StyleResponse) {
    try {
      await createStyle({ name: style.name, css: style.css })
      setSavedName(style.name)
      setSaveError(null)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'The style could not be saved.',
      )
    }
  }

  function handleStartOver() {
    setDraft('')
    setLookDescription(null)
    setSavedName(null)
    setSaveError(null)
  }

  return (
    <div className="style-generator-step">
      <form className="style-generator-step__form" onSubmit={handleSubmit}>
        <label className="style-generator-step__label" htmlFor={textareaId}>
          Describe the look you want
        </label>
        <p className="style-generator-step__hint" id={hintId}>
          For example: minimal, modern, two-column with a dark sidebar. The
          generated style will target the same class names as every saved
          resume, so it works with any of them.
        </p>
        <textarea
          id={textareaId}
          className="app-textarea style-generator-step__textarea"
          aria-describedby={hintId}
          rows={5}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="app-actions style-generator-step__actions">
          <button
            type="submit"
            className="app-button"
            disabled={draft.trim() === ''}
          >
            {lookDescription === null ? 'Generate prompt' : 'Update prompt'}
          </button>
        </div>
      </form>

      {prompt !== null && savedName === null ? (
        <PromptStep
          title="Style prompt"
          prompt={prompt}
          schema={styleResponseSchema}
          onSave={handleSave}
          saveLabel="Save style"
          helperText={
            <p>
              Copy the prompt below and paste it into any AI assistant. It will
              reply with a name and the CSS for your look. Paste that reply back
              into the box underneath, check the preview, and save it. The style
              is then available for every saved resume.
            </p>
          }
        />
      ) : null}

      {saveError !== null ? (
        <p className="app-error-banner" role="alert">
          {saveError}
        </p>
      ) : null}

      <span
        className="app-visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {savedName !== null ? `Style saved: ${savedName}.` : ''}
      </span>

      {savedName !== null ? (
        <div className="style-generator-step__saved">
          <p>
            Saved the style &ldquo;{savedName}&rdquo;. You can find it in your
            saved styles on the home page.
          </p>
          <div className="app-actions style-generator-step__actions">
            <Link className="app-button" to="/">
              Back to home
            </Link>
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={handleStartOver}
            >
              Generate another style
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}