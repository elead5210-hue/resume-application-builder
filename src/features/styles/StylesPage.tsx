import { useSearchParams } from 'react-router-dom'
import StyleEditor from './StyleEditor'
import StyleGeneratorStep from './StyleGeneratorStep'

export default function StylesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const editingStyleId = searchParams.get('style')
  const writingNewStyle = searchParams.has('new')
  const editorOpen = editingStyleId !== null || writingNewStyle

  function openNewStyleEditor() {
    setSearchParams({ new: '1' })
  }

  function closeEditor() {
    setSearchParams({})
  }

  return (
    <section>
      <h2 className="app-page-title">Styles</h2>
      <p className="app-page-lead">
        Describe a look and generate a CSS style for your resumes. Saved
        styles work with any saved resume.
      </p>
      {editorOpen ? (
        <div className="app-card">
          <StyleEditor
            key={editingStyleId ?? 'new'}
            styleId={editingStyleId}
            onClose={closeEditor}
          />
        </div>
      ) : (
        <div className="app-actions">
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={openNewStyleEditor}
          >
            Write CSS by hand
          </button>
        </div>
      )}
      <div className="app-card">
        <StyleGeneratorStep />
      </div>
    </section>
  )
}