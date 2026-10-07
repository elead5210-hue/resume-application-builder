import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useStorageStore } from '@/shared/storage'
import { useFocusOnChange } from './use-focus-on-change'

export default function AppLayout() {
  const error = useStorageStore((state) => state.error)
  const location = useLocation()
  // Move focus to the main content after each navigation, so keyboard and
  // screen reader users start at the top of the new page. The first load is
  // skipped, so the page does not steal focus when it opens.
  const mainRef = useFocusOnChange<HTMLElement>(location.pathname, {
    preventScroll: true,
  })

  return (
    <div className="app-shell">
      <a href="#main-content" className="app-skip-link">
        Skip to main content
      </a>
      <header className="app-header">
        <h1 className="app-brand">Resume Builder</h1>
        <nav className="app-nav" aria-label="Main navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/resume">Resume</NavLink>
          <NavLink to="/styles">Styles</NavLink>
          <NavLink to="/render">Render</NavLink>
        </nav>
      </header>
      {error ? (
        <div
          className="app-error-banner"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          Storage problem: {error}
        </div>
      ) : null}
      <main
        id="main-content"
        ref={mainRef}
        className="app-main"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}