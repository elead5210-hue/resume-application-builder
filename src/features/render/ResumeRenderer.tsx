import { useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import type { StyleSheet } from '@/shared/types'
import { downloadTextFile } from '@/shared/ui/download-file'

import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  countPages,
  formatPageCount,
  formatZoom,
  getStageSize,
  zoomIn,
  zoomOut,
} from './a4-preview'
import { buildDocument } from './build-document'
import {
  DEFAULT_STYLE_ID,
  DEFAULT_STYLE_NAME,
} from './default-style'
import { EXPORT_HTML_MIME_TYPE, getExportFileName } from './export-html'
import { printFrame } from './print-frame'

/**
 * Sandbox for the preview frame. Scripts stay blocked (no allow-scripts), so
 * the resume document cannot run code. allow-same-origin lets the page read
 * the frame's height and call print() on it, and allow-modals lets the
 * browser open its print dialog.
 */
const FRAME_SANDBOX = 'allow-same-origin allow-modals'

interface ResumeRendererProps {
  /** The cleaned resume HTML saved on the session. */
  html: string
  /** Saved styles the user can pick from. */
  styles: StyleSheet[]
  /** Title for the preview document and the frame. */
  title?: string
  /** The style selected first. Defaults to the built-in minimal style. */
  initialStyleId?: string
  /** Called whenever the user picks a different style. */
  onStyleChange?: (styleId: string) => void
}

/**
 * Resume preview: a style dropdown above a sandboxed iframe. The document is
 * rebuilt from the base print stylesheet, the selected CSS and the saved HTML
 * every time the choice changes, so switching styles re-renders instantly.
 * The built-in minimal style is used when no saved style is chosen, or when
 * the chosen style no longer exists.
 */
function ResumeRenderer({
  html,
  styles,
  title = 'Resume',
  initialStyleId = DEFAULT_STYLE_ID,
  onStyleChange,
}: ResumeRendererProps) {
  const selectId = useId()
  const [styleId, setStyleId] = useState<string>(initialStyleId)
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM)
  const [pageCount, setPageCount] = useState<number>(1)
  const [printError, setPrintError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const selectedStyle = useMemo(
    () => styles.find((style) => style.id === styleId),
    [styles, styleId],
  )

  // A style that was deleted after being chosen falls back to the built-in one.
  const effectiveStyleId = selectedStyle ? selectedStyle.id : DEFAULT_STYLE_ID

  const srcDoc = useMemo(
    () =>
      buildDocument({
        html,
        styleCss: selectedStyle?.css ?? null,
        title,
      }),
    [html, selectedStyle, title],
  )

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value
    setStyleId(nextId)
    onStyleChange?.(nextId)
  }

  // Measures the loaded document so the frame can grow to whole A4 pages.
  function handleFrameLoad() {
    const body = frameRef.current?.contentDocument?.body
    if (body) {
      setPageCount(countPages(body.scrollHeight))
    }
  }

  function handlePrint() {
    const result = printFrame(frameRef.current)
    setPrintError(result.ok ? null : result.error)
  }

  // Downloads the same document the preview shows, with the chosen style embedded.
  function handleExportHtml() {
    const fileName = getExportFileName(
      title,
      selectedStyle?.name ?? DEFAULT_STYLE_NAME,
    )
    const started = downloadTextFile(srcDoc, fileName, {
      mimeType: EXPORT_HTML_MIME_TYPE,
    })
    setExportError(
      started ? null : 'The HTML file could not be downloaded in this browser.',
    )
  }

  const stage = getStageSize(pageCount, zoom)

  return (
    <div className="render-renderer">
      <div className="render-renderer__toolbar">
        <label className="render-renderer__label" htmlFor={selectId}>
          Style
        </label>
        <select
          id={selectId}
          className="render-renderer__select"
          value={effectiveStyleId}
          onChange={handleChange}
        >
          <option value={DEFAULT_STYLE_ID}>{DEFAULT_STYLE_NAME}</option>
          {styles.map((style) => (
            <option key={style.id} value={style.id}>
              {style.name}
            </option>
          ))}
        </select>
        <div className="render-renderer__zoom" role="group" aria-label="Zoom">
          <button
            type="button"
            className="render-renderer__zoom-button app-button app-button--secondary"
            onClick={() => setZoom(zoomOut)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
          >
            -
          </button>
          <span className="render-renderer__zoom-value" aria-live="polite">
            {formatZoom(zoom)}
          </span>
          <button
            type="button"
            className="render-renderer__zoom-button app-button app-button--secondary"
            onClick={() => setZoom(zoomIn)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
        <span className="render-renderer__page-count" aria-live="polite">
          {formatPageCount(pageCount)}
        </span>
        <button
          type="button"
          className="render-renderer__print app-button"
          onClick={handlePrint}
        >
          Print
        </button>
        <button
          type="button"
          className="render-renderer__export app-button app-button--secondary"
          onClick={handleExportHtml}
        >
          Export HTML
        </button>
      </div>
      {printError ? (
        <p className="render-renderer__error" role="alert">
          {printError}
        </p>
      ) : null}
      {exportError ? (
        <p className="render-renderer__error" role="alert">
          {exportError}
        </p>
      ) : null}
      <div className="render-renderer__viewport">
        <div
          className="render-renderer__stage"
          style={{ width: stage.width, height: stage.height }}
        >
          <iframe
            ref={frameRef}
            className="render-renderer__frame"
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX * pageCount,
              transform: `scale(${zoom})`,
            }}
            title={`${title} preview`}
            sandbox={FRAME_SANDBOX}
            srcDoc={srcDoc}
            onLoad={handleFrameLoad}
          />
        </div>
      </div>
    </div>
  )
}

export default ResumeRenderer