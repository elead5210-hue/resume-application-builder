import { Link, useNavigate } from 'react-router-dom'
import { SessionList } from '@/features/resume'
import { StyleList } from '@/features/styles'
import { useStorageStore } from '@/shared/storage'
import BackupPanel from '@/shared/ui/BackupPanel'

export default function HomePage() {
  const navigate = useNavigate()
  const createSession = useStorageStore((state) => state.createSession)

  async function handleStartNewResume() {
    const session = await createSession()
    navigate(`/resume?session=${encodeURIComponent(session.id)}`)
  }

  return (
    <section>
      <h2 className="app-page-title">Welcome</h2>
      <p className="app-page-lead">
        Build a tailored, print-ready resume for a specific job using any AI
        assistant. Start a new resume or create a style to apply to your
        resumes.
      </p>
      <p className="app-notice" role="note">
        <strong>Your data stays in this browser.</strong> Resumes and styles are
        stored only on this device and are not uploaded anywhere. Clearing
        browser data deletes them, so export a backup regularly.
      </p>
      <div className="app-actions">
        <button
          type="button"
          className="app-button"
          onClick={() => void handleStartNewResume()}
        >
          Start new resume
        </button>
        <Link to="/styles" className="app-button app-button--secondary">
          Generate styling
        </Link>
      </div>

      <div className="app-dashboard">
        <section aria-labelledby="saved-resumes-heading">
          <h3 id="saved-resumes-heading" className="app-section-title">
            Saved resumes
          </h3>
          <SessionList />
        </section>
        <section aria-labelledby="saved-styles-heading">
          <h3 id="saved-styles-heading" className="app-section-title">
            Saved styles
          </h3>
          <StyleList />
        </section>
      </div>

      <BackupPanel />
    </section>
  )
}