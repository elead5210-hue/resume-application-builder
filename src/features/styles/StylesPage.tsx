import StyleGeneratorStep from './StyleGeneratorStep'

export default function StylesPage() {
  return (
    <section>
      <h2 className="app-page-title">Styles</h2>
      <p className="app-page-lead">
        Describe a look and generate a CSS style for your resumes. Saved
        styles work with any saved resume.
      </p>
      <div className="app-card">
        <StyleGeneratorStep />
      </div>
    </section>
  )
}