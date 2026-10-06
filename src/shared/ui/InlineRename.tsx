import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

interface InlineRenameProps {
  /** The current name to display and edit. */
  value: string
  /** Called with the trimmed new name when the user saves a change. */
  onSave: (newValue: string) => void
  /** Whether the control is in edit mode. */
  editing: boolean
  /** Called when the user asks to start editing (for example via a Rename button). */
  onStartEdit: () => void
  /** Called when the user cancels or finishes editing. */
  onStopEdit: () => void
  /** Accessible label for the text field. */
  label?: string
  /** Name shown when value is empty. */
  placeholder?: string
}

/**
 * Inline rename control with view, edit, save and cancel states.
 *
 * The parent owns the editing state so a list can ensure only one row is
 * edited at a time and place its own Rename button. Enter saves, Escape
 * cancels, and empty or unchanged names are treated as a cancel.
 */
export default function InlineRename({
  value,
  onSave,
  editing,
  onStartEdit,
  onStopEdit,
  label = 'Name',
  placeholder = 'Untitled',
}: InlineRenameProps) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  // Reset the draft and focus the field each time editing starts.
  useEffect(() => {
    if (editing) {
      setDraft(value)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    }
    onStopEdit()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onStopEdit()
    }
  }

  if (!editing) {
    return (
      <span className="app-inline-rename__name">{value || placeholder}</span>
    )
  }

  return (
    <form className="app-inline-rename" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="app-visually-hidden">
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        className="app-input"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="submit" className="app-button">
        Save
      </button>
      <button
        type="button"
        className="app-button app-button--secondary"
        onClick={onStopEdit}
      >
        Cancel
      </button>
    </form>
  )
}