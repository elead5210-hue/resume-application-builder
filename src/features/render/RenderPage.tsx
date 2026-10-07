import { Link, useSearchParams } from 'react-router-dom'

import { useStorageStore } from '@/shared/storage'
import type { ResumeSession } from '@/shared/types'

import ResumeRenderer from './ResumeRenderer'

/** True when the session has saved, non-blank final HTML. */
function hasSavedHtml(session: ResumeSession): boolean {
  return (
    typeof session.finalHtml === 'string' && session.finalHtml.trim() !== ''
  )
}

/**
 * Render screen: previews the saved resume HTML of the session named by the
 * `session` query parameter, with a style dropdown fed by the saved styles.
 * Shows an empty state when nothing is selected or no HTML has been saved.
 */
export default function RenderPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const hydrated = useStorageStore((state) => state.hydrated)
  const sessions = useStorageStore((state) => state.sessions)
  const styles = useStorageStore((state) => state.styles)

  const session = sessionId
    ? sessions.find((item) => item.id === sessionId)
    : undefined
  const renderableSessions = sessions.filter(hasSavedHtml)

  let content
  if (!hydrated) {
    content = (
      <div className="app-card">
        <p>Loading saved resumes...</p>
      </div>
    )
  } else if (session && hasSavedHtml(session)) {
    content = (
      <div className="app-card">
        <ResumeRenderer
          key={session.id}
          html={session.finalHtml as string}
          styles={styles}
          title={session.title}
        />
      </div>
    )
  } else if (session) {
    content = (
      <div className="app-empty">
        <p>This resume has no saved HTML yet.</p>
        <p>
          Finish the question loop and save the final HTML, then come back to
          preview it.
        </p>
        <Link className="app-button app-button--secondary" to="/">
          Back to dashboard
        </Link>
      </div>
    )
  } else if (sessionId) {
    content = (
      <div className="app-empty">
        <p>That resume could not be found. It may have been deleted.</p>
        <Link className="app-button app-button--secondary" to="/">
          Back to dashboard
        </Link>
      </div>
    )
  } else if (renderableSessions.length > 0) {
    content = (
      <div className="app-card">
        <h3 className="app-section-title">Choose a resume to preview</h3>
        <ul className="app-list">
          {renderableSessions.map((item) => (
            <li key={item.id} className="app-list__row">
              <span className="app-list__main">{item.title}</span>
              <Link
                className="app-button app-button--secondary"
                to={`/render?session=${encodeURIComponent(item.id)}`}
              >
                Preview
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  } else {
    content = (
      <div className="app-empty">
        <p>No resume with saved HTML to render yet.</p>
        <Link className="app-button app-button--secondary" to="/">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <section>
      <h2 className="app-page-title">Render</h2>
      <p className="app-page-lead">
        Preview a saved resume with a chosen style. Switching styles updates
        the preview instantly.
      </p>
      {content}
    </section>
  )
}