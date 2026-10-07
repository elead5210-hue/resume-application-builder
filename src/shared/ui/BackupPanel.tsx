import { useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import {
  buildBackup,
  getBackupFileName,
  parseBackup,
  serializeBackup,
  useStorageStore,
} from '@/shared/storage'
import type { ParseBackupSuccess } from '@/shared/storage'

import { downloadTextFile } from './download-file'

/** The MIME type used when downloading a backup. */
const BACKUP_MIME_TYPE = 'application/json;charset=utf-8'

/** What the import part of the panel is showing. */
type ImportState =
  | { kind: 'idle' }
  | { kind: 'errors'; fileName: string; errors: string[] }
  | { kind: 'ready'; fileName: string; result: ParseBackupSuccess }
  | { kind: 'importing'; fileName: string }
  | { kind: 'done'; sessionCount: number; styleCount: number }

/** Returns "1 session" or "3 sessions" for a count and a singular noun. */
function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** Formats an ISO timestamp for display, falling back to the raw text. */
function formatExportedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

/**
 * Backup panel for the dashboard. Export saves every session and style to one
 * JSON file. Import reads a chosen JSON file, validates it, shows either the
 * problems found or a summary of what it contains, and only saves anything
 * after the user confirms.
 */
function BackupPanel() {
  const fileInputId = useId()
  const fileHintId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sessions = useStorageStore((state) => state.sessions)
  const styles = useStorageStore((state) => state.styles)
  const importBackup = useStorageStore((state) => state.importBackup)

  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [exportFailed, setExportFailed] = useState(false)
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' })
  const [importError, setImportError] = useState<string | null>(null)

  const nothingToExport = sessions.length === 0 && styles.length === 0

  // Counts how many records in a validated backup would replace saved ones.
  const replaceCounts = useMemo(() => {
    if (importState.kind !== 'ready') {
      return { sessions: 0, styles: 0 }
    }
    const sessionIds = new Set(sessions.map((session) => session.id))
    const styleIds = new Set(styles.map((style) => style.id))
    const { backup } = importState.result
    return {
      sessions: backup.sessions.filter((session) => sessionIds.has(session.id))
        .length,
      styles: backup.styles.filter((style) => styleIds.has(style.id)).length,
    }
  }, [importState, sessions, styles])

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleExport() {
    const backup = buildBackup(sessions, styles)
    const started = downloadTextFile(
      serializeBackup(backup),
      getBackupFileName(),
      { mimeType: BACKUP_MIME_TYPE },
    )
    setExportFailed(!started)
    setExportMessage(
      started
        ? `Backup saved with ${countLabel(sessions.length, 'session')} and ${countLabel(styles.length, 'style')}.`
        : 'The backup file could not be downloaded in this browser.',
    )
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setImportError(null)

    if (!file) {
      setImportState({ kind: 'idle' })
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      setImportState({
        kind: 'errors',
        fileName: file.name,
        errors: ['The file could not be read.'],
      })
      clearFileInput()
      return
    }

    const result = parseBackup(text)
    if (result.ok) {
      setImportState({ kind: 'ready', fileName: file.name, result })
    } else {
      setImportState({
        kind: 'errors',
        fileName: file.name,
        errors: result.errors,
      })
    }
    clearFileInput()
  }

  async function handleConfirmImport() {
    if (importState.kind !== 'ready') {
      return
    }

    const { fileName, result } = importState
    setImportError(null)
    setImportState({ kind: 'importing', fileName })

    const outcome = await importBackup(result.backup)
    if (outcome.ok) {
      setImportState({
        kind: 'done',
        sessionCount: outcome.sessionCount,
        styleCount: outcome.styleCount,
      })
    } else {
      setImportError(outcome.error)
      setImportState({ kind: 'ready', fileName, result })
    }
  }

  function handleCancelImport() {
    setImportError(null)
    setImportState({ kind: 'idle' })
    clearFileInput()
  }

  const importing = importState.kind === 'importing'

  return (
    <section className="backup-panel app-card" aria-labelledby={`${fileInputId}-title`}>
      <h3 id={`${fileInputId}-title`} className="backup-panel__title app-section-title">
        Backup
      </h3>
      <p className="backup-panel__lead app-page-lead">
        Everything is stored in this browser only. Export a backup file to keep
        a copy or move to another browser, and import it to restore.
      </p>

      <div className="backup-panel__export">
        <div className="backup-panel__actions app-actions">
          <button
            type="button"
            className="backup-panel__export-button app-button"
            onClick={handleExport}
            disabled={nothingToExport}
          >
            Export backup
          </button>
        </div>
        {nothingToExport ? (
          <p className="backup-panel__status">
            There is nothing to export yet. Start a resume or save a style
            first.
          </p>
        ) : null}
        {exportMessage ? (
          <p
            className={
              exportFailed
                ? 'backup-panel__status backup-panel__status--error'
                : 'backup-panel__status'
            }
            role={exportFailed ? 'alert' : 'status'}
          >
            {exportMessage}
          </p>
        ) : null}
      </div>

      <div className="backup-panel__import">
        <label className="backup-panel__label" htmlFor={fileInputId}>
          Import backup
        </label>
        <p id={fileHintId} className="backup-panel__hint">
          Choose a backup file ending in .json. Nothing is saved until you
          confirm.
        </p>
        <input
          ref={fileInputRef}
          id={fileInputId}
          className="backup-panel__file-input"
          type="file"
          accept="application/json,.json"
          aria-describedby={fileHintId}
          onChange={handleFileChange}
          disabled={importing}
        />

        {importState.kind === 'errors' ? (
          <div className="backup-panel__errors" role="alert">
            <p className="backup-panel__errors-title">
              {importState.fileName} could not be imported:
            </p>
            <ul className="backup-panel__error-list">
              {importState.errors.map((message, index) => (
                <li key={`${index}-${message}`}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {importState.kind === 'ready' || importState.kind === 'importing' ? (
          <div className="backup-panel__summary" role="status">
            <p className="backup-panel__summary-title">
              {importState.fileName} is a valid backup.
            </p>
            {importState.kind === 'ready' ? (
              <>
                <ul className="backup-panel__summary-list">
                  <li>
                    {countLabel(importState.result.summary.sessionCount, 'session')}
                  </li>
                  <li>
                    {countLabel(importState.result.summary.styleCount, 'style')}
                  </li>
                  <li>
                    Exported {formatExportedAt(importState.result.summary.exportedAt)}
                  </li>
                  {importState.result.migrated ? (
                    <li>
                      Made with an older version (backup version{' '}
                      {importState.result.fromBackupVersion}) and upgraded
                      automatically.
                    </li>
                  ) : null}
                </ul>
                {replaceCounts.sessions + replaceCounts.styles > 0 ? (
                  <p className="backup-panel__warning">
                    {countLabel(replaceCounts.sessions, 'session')} and{' '}
                    {countLabel(replaceCounts.styles, 'style')} in this browser
                    have the same id and will be replaced by the versions in
                    the file. Everything else is kept.
                  </p>
                ) : (
                  <p className="backup-panel__hint">
                    Importing adds these to what is already saved in this
                    browser.
                  </p>
                )}
              </>
            ) : (
              <p className="backup-panel__hint">Importing...</p>
            )}

            {importError ? (
              <p
                className="backup-panel__status backup-panel__status--error"
                role="alert"
              >
                The import failed: {importError}
              </p>
            ) : null}

            <div className="backup-panel__actions app-actions">
              <button
                type="button"
                className="backup-panel__confirm app-button"
                onClick={handleConfirmImport}
                disabled={importing}
              >
                Confirm import
              </button>
              <button
                type="button"
                className="backup-panel__cancel app-button app-button--secondary"
                onClick={handleCancelImport}
                disabled={importing}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {importState.kind === 'done' ? (
          <p className="backup-panel__status" role="status">
            Imported {countLabel(importState.sessionCount, 'session')} and{' '}
            {countLabel(importState.styleCount, 'style')}.
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default BackupPanel