import { useEffect, useId, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Style the confirm button as a destructive action. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Accessible modal confirmation dialog built on the native <dialog> element.
 *
 * Focus moves into the dialog when it opens and returns to the previously
 * focused element when it closes. Escape and the Cancel button both call
 * onCancel.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        // Prevent the browser closing it on its own; the parent controls
        // the open state.
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) cancels.
        if (event.target === dialogRef.current) onCancel()
      }}
    >
      <h2 id={titleId} className="app-dialog__title">
        {title}
      </h2>
      <p id={messageId} className="app-dialog__message">
        {message}
      </p>
      <div className="app-actions app-dialog__actions">
        <button
          type="button"
          className="app-button app-button--secondary"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={
            destructive ? 'app-button app-button--danger' : 'app-button'
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}