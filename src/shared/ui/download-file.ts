/**
 * Downloads text content as a file in the browser.
 *
 * The text is wrapped in a Blob and given a temporary object URL. A hidden
 * link pointing at that URL is clicked to start the download, and the link
 * and the URL are cleaned up afterwards. It is shared by the JSON backup and
 * the standalone HTML export.
 */

/** The MIME type used when none is given. */
const DEFAULT_MIME_TYPE = 'text/plain;charset=utf-8'

/** How long the object URL stays alive after the click, in milliseconds. */
const REVOKE_DELAY_MS = 1000

/** Options for downloading a file. */
export interface DownloadFileOptions {
  /** The MIME type of the file, such as "application/json;charset=utf-8". */
  mimeType?: string
}

/**
 * Starts a download of the given text as a file with the given name.
 *
 * Returns true when the download was started, and false when it could not be
 * started, for example when it is called outside a browser.
 */
export function downloadTextFile(
  content: string,
  fileName: string,
  options: DownloadFileOptions = {},
): boolean {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false
  }

  const blob = new Blob([content], {
    type: options.mimeType ?? DEFAULT_MIME_TYPE,
  })
  const url = URL.createObjectURL(blob)

  try {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch {
    return false
  } finally {
    // Some browsers need the URL to stay valid for a moment after the click.
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
    }, REVOKE_DELAY_MS)
  }
}