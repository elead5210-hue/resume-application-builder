import { useEffect, useId, useRef } from 'react'
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

  const errorHeadingId = useId()
  const errorMessageId = useId()
  const errorHeadingRef = useRef<HTMLHeadingElement>(null)
  const showingError = !hydrated && error !== null

  // When loading fails, move focus to the error heading so keyboard and screen
  // reader users land on the problem and can tab straight to the retry button.
  useEffect(() => {
    if (showingError) {
      errorHeadingRef.current?.focus()
    }
  }, [showingError])

  if (hydrated) {
    return <>{children}</>
  }

  if (error) {
    return (
      <main className="app-main" aria-labelledby={errorHeadingId}>
        <h2
          id={errorHeadingId}
          ref={errorHeadingRef}
          className="app-page-title"
          tabIndex={-1}
          aria-describedby={errorMessageId}
        >
          Could not load saved data
        </h2>
        <p id={errorMessageId} className="app-page-lead">
          {error} Your saved resumes and styles are still in this browser. Try
          again, or reload the page.
        </p>
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
    <main className="app-main" aria-busy="true">
      <p className="app-page-lead" role="status" aria-live="polite">
        Loading your saved resumes and styles...
      </p>
    </main>
  )
}