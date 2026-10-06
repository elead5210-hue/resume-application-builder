import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section>
      <h2 className="app-page-title">Page not found</h2>
      <p className="app-page-lead">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="app-actions">
        <Link to="/" className="app-button">
          Back to home
        </Link>
      </div>
    </section>
  )
}