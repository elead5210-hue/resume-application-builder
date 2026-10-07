import { useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { analyzeCssCoverage, validateCss } from '@/shared/prompting'
import { useStorageStore } from '@/shared/storage'

interface StyleEditorProps {
  /** The id of the saved style to edit, or null to write a new style by hand. */
  styleId: string | null
  /** Called after a successful save and when the user cancels. */
  onClose: () => void
}

/**
 * Style editor: a name input and a CSS textarea used both to write or paste
 * CSS by hand without the AI and to edit a saved style. The CSS is validated
 * on save, and a live coverage report shows which selector contract classes
 * the CSS does not target yet.
 *
 * Mount it with a key that changes with the style id so the fields reset when
 * a different style is opened.
 */
export default function StyleEditor({ styleId, onClose }: StyleEditorProps) {
  const nameId = useId()
  const cssId = useId()
  const cssHintId = useId()

  const existing = useStorageStore((state) =>
    styleId === null
      ? undefined
      : state.styles.find((style) => style.id === styleId),
  )
  const createStyle = useStorageStore((state) => state.createStyle)
  const updateStyle = useStorageStore((state) => state.updateStyle)

  const [name, setName] = useState(existing?.name ?? '')
  const [css, setCss] = useState(existing?.css ?? '')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const coverage = useMemo(() => analyzeCssCoverage(css), [css])
  const hasCss = css.trim() !== ''

  if (styleId !== null && existing === undefined) {
    return (
      <div className="style-editor">
        <p className="app-empty">This style no longer exists.</p>
        <div className="app-actions style-editor__actions">
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const problems: string[] = []
    if (name.trim() === '') {
      problems.push('Give the style a name.')
    }
    problems.push(...validateCss(css).errors)

    if (problems.length > 0) {
      setErrors(problems)
      return
    }

    setErrors([])
    setSaving(true)
    try {
      if (styleId === null) {
        await createStyle({ name: name.trim(), css })
      } else {
        await updateStyle(styleId, { name: name.trim(), css })
      }
      onClose()
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : 'The style could not be saved.',
      ])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="style-editor" onSubmit={handleSubmit} noValidate>
      <h3 className="app-section-title">
        {styleId === null ? 'Write a style by hand' : 'Edit style'}
      </h3>

      <div className="style-editor__field">
        <label className="style-editor__label" htmlFor={nameId}>
          Style name
        </label>
        <input
          id={nameId}
          className="app-input style-editor__input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="style-editor__field">
        <label className="style-editor__label" htmlFor={cssId}>
          CSS
        </label>
        <p className="style-editor__hint" id={cssHintId}>
          Write or paste CSS rules that target the resume class names. Imports
          and external url() references are not allowed.
        </p>
        <textarea
          id={cssId}
          className="app-textarea app-code style-editor__textarea"
          aria-describedby={cssHintId}
          aria-invalid={errors.length > 0}
          rows={16}
          spellCheck={false}
          value={css}
          onChange={(event) => setCss(event.target.value)}
        />
      </div>

      {errors.length > 0 ? (
        <ul className="style-editor__errors" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      <section className="style-editor__coverage" aria-live="polite">
        <h4 className="style-editor__coverage-title">Selector coverage</h4>
        {hasCss ? (
          <>
            <p className="style-editor__coverage-summary">
              This style covers {coverage.coveredClasses.length} of{' '}
              {coverage.coveredClasses.length + coverage.uncoveredClasses.length}{' '}
              contract classes ({coverage.coveragePercent}%).
            </p>
            {coverage.uncoveredClasses.length > 0 ? (
              <div className="style-editor__coverage-group">
                <p className="style-editor__coverage-label">
                  Not covered by this style:
                </p>
                <ul className="style-editor__coverage-list">
                  {coverage.uncoveredClasses.map((className) => (
                    <li key={className}>
                      <code>.{className}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="style-editor__coverage-ok">
                Every contract class has a rule.
              </p>
            )}
            {coverage.unknownClasses.length > 0 ? (
              <div className="style-editor__coverage-group">
                <p className="style-editor__coverage-label">
                  Outside the contract (never used by saved resumes):
                </p>
                <ul className="style-editor__coverage-list">
                  {coverage.unknownClasses.map((className) => (
                    <li key={className}>
                      <code>.{className}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="style-editor__coverage-summary">
            Add some CSS to see which contract classes it covers.
          </p>
        )}
      </section>

      <div className="app-actions style-editor__actions">
        <button type="submit" className="app-button" disabled={saving}>
          {saving ? 'Saving…' : 'Save style'}
        </button>
        <button
          type="button"
          className="app-button app-button--secondary"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}