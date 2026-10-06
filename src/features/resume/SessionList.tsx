import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStorageStore } from '@/shared/storage'
import type { ResumeSession } from '@/shared/types'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import InlineRename from '@/shared/ui/InlineRename'
import { getSessionProgress, getStageLabel } from './session-progress'

/**
 * Lists saved resume sessions with their stage and progress, and lets the
 * user resume, rename or delete each one.
 */
export default function SessionList() {
  const sessions = useStorageStore((state) => state.sessions)
  const updateSession = useStorageStore((state) => state.updateSession)
  const removeSession = useStorageStore((state) => state.removeSession)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ResumeSession | null>(
    null,
  )

  if (sessions.length === 0) {
    return (
      <div className="app-card app-empty">
        <p>No saved resumes yet. Start a new resume to begin.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="app-list">
        {sessions.map((session) => {
          const progress = getSessionProgress(session)
          return (
            <li key={session.id} className="app-list__row">
              <div className="app-list__main">
                <InlineRename
                  value={session.title}
                  label="Resume title"
                  placeholder="Untitled resume"
                  editing={editingId === session.id}
                  onStartEdit={() => setEditingId(session.id)}
                  onStopEdit={() => setEditingId(null)}
                  onSave={(title) => void updateSession(session.id, { title })}
                />
                <div className="app-list__meta">
                  <span className="app-badge">
                    {getStageLabel(session.stage)}
                  </span>
                  <progress
                    className="app-progress"
                    max={100}
                    value={progress}
                    aria-label={`Progress for ${session.title}`}
                  />
                  <span className="app-list__percent">{progress}%</span>
                </div>
              </div>
              <div className="app-actions">
                <Link
                  to={`/resume?session=${encodeURIComponent(session.id)}`}
                  className="app-button"
                >
                  Resume
                </Link>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  onClick={() => setEditingId(session.id)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  onClick={() => setPendingDelete(session)}
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this resume?"
        message={`"${pendingDelete?.title ?? ''}" and all its answers will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void removeSession(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </>
  )
}