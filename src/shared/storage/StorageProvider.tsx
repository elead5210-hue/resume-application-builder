import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useStorageStore } from './store'

interface StorageProviderProps {
  children: ReactNode
}

/**
 * Hydrates the storage store from IndexedDB on startup and holds back the
 * rest of the app until the data is ready, so routes never render with
 * empty sessions or styles that are still loading.
 *
 * If loading fails, an error message is shown with a retry button.
 */
export default function StorageProvider({ children }: StorageProviderProps) {
  const hydrated = useStorageStore((state) => state.hydrated)
  const error = useStorageStore((state) => state.error)
  const hydrate = useStorageStore((state) => state.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (hydrated) {
    return <>{children}</>
  }

  if (error) {
    return (
      <main className="app-main" role="alert">
        <h2 className="app-page-title">Could not load saved data</h2>
        <p className="app-page-lead">{error}</p>
        <div className="app-actions">
          <button
            type="button"
            className="app-button"
            onClick={() => void hydrate()}
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="app-main" aria-busy="true" aria-live="polite">
      <p className="app-page-lead">Loading your saved resumes and styles...</p>
    </main>
  )
}