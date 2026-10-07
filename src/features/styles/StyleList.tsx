import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStorageStore } from '@/shared/storage'
import type { StyleSheet } from '@/shared/types'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import InlineRename from '@/shared/ui/InlineRename'

/**
 * Lists saved styles and lets the user edit, rename or delete each one.
 */
export default function StyleList() {
  const styles = useStorageStore((state) => state.styles)
  const updateStyle = useStorageStore((state) => state.updateStyle)
  const duplicateStyle = useStorageStore((state) => state.duplicateStyle)
  const removeStyle = useStorageStore((state) => state.removeStyle)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<StyleSheet | null>(null)

  if (styles.length === 0) {
    return (
      <div className="app-card app-empty">
        <p>No saved styles yet. Generate a style to get started.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="app-list">
        {styles.map((style) => (
          <li key={style.id} className="app-list__row">
            <div className="app-list__main">
              <InlineRename
                value={style.name}
                label="Style name"
                placeholder="Untitled style"
                editing={editingId === style.id}
                onStopEdit={() => setEditingId(null)}
                onSave={(name) => void updateStyle(style.id, { name })}
              />
            </div>
            <div className="app-actions">
              <Link
                to={`/styles?style=${encodeURIComponent(style.id)}`}
                className="app-button"
              >
                Edit
              </Link>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => setEditingId(style.id)}
              >
                Rename
              </button>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void duplicateStyle(style.id)}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => setPendingDelete(style)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this style?"
        message={`"${pendingDelete?.name ?? ''}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void removeStyle(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </>
  )
}