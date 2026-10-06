import { useId, useMemo } from 'react'

interface SanitizedHtmlPreviewProps {
  /** The cleaned resume HTML returned by the sanitizer. */
  html: string
  /** Warnings the sanitizer raised about the pasted HTML. */
  warnings: ReadonlyArray<string>
}

/**
 * Minimal readable defaults for the preview only. Saved styles are applied
 * later by the renderer, so this just keeps the unstyled HTML legible.
 */
const PREVIEW_BASE_CSS = [
  'body { font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; margin: 16px; color: #1a1a1a; }',
  'ul { padding-left: 20px; }',
].join('\n')

/**
 * Builds the document shown in the preview frame. The content security
 * policy blocks every external resource, so the preview cannot load anything
 * even if the HTML were to reference it.
 */
function buildPreviewDocument(html: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8" />',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'" />',
    `<style>${PREVIEW_BASE_CSS}</style>`,
    '</head>',
    `<body>${html}</body>`,
    '</html>',
  ].join('\n')
}

/**
 * Shows the sanitizer warnings and renders the cleaned resume HTML in a
 * sandboxed iframe, so the user can check the result before saving it.
 *
 * The sandbox attribute is empty on purpose: scripts, forms, popups and
 * same-origin access are all turned off for the preview.
 */
export default function SanitizedHtmlPreview({
  html,
  warnings,
}: SanitizedHtmlPreviewProps) {
  const titleId = useId()
  const warningsId = useId()
  const srcDoc = useMemo(() => buildPreviewDocument(html), [html])

  return (
    <section className="sanitized-preview" aria-labelledby={titleId}>
      <h3 id={titleId} className="sanitized-preview__title">
        Cleaned HTML preview
      </h3>
      {warnings.length > 0 ? (
        <div
          id={warningsId}
          className="sanitized-preview__warnings"
          role="status"
        >
          <p className="sanitized-preview__warnings-title">
            Check these before saving:
          </p>
          <ul className="sanitized-preview__warning-list">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="sanitized-preview__clean" role="status">
          No problems found in the pasted HTML.
        </p>
      )}
      <iframe
        className="sanitized-preview__frame"
        title="Cleaned resume HTML preview"
        sandbox=""
        srcDoc={srcDoc}
      />
    </section>
  )
}