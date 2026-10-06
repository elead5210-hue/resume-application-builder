import { NavLink, Outlet } from 'react-router-dom'
import { useStorageStore } from '@/shared/storage'

export default function AppLayout() {
  const error = useStorageStore((state) => state.error)

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
        <div className="app-error-banner" role="alert">
          Storage problem: {error}
        </div>
      ) : null}
      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}