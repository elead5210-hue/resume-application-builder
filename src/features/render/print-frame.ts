/**
 * Prints the contents of a preview iframe so only the resume is printed and
 * the app UI around it is left out.
 *
 * The frame must be same-origin with the page (sandbox "allow-same-origin")
 * and allow modals ("allow-modals") for print() to work. Without
 * "allow-scripts" the resume document still cannot run any script of its own.
 */

/** The result of asking a frame to print. */
export type PrintFrameResult =
  | { ok: true }
  | {
      ok: false
      /** A short, human-readable reason the frame could not be printed. */
      error: string
    }

/**
 * Focuses the frame and calls print() on its contentWindow. Returns a result
 * instead of throwing, so callers can show the reason when printing fails.
 * Focusing first matters in Safari and Firefox, which otherwise may print the
 * parent page instead of the frame.
 */
export function printFrame(
  frame: HTMLIFrameElement | null | undefined,
): PrintFrameResult {
  if (!frame) {
    return { ok: false, error: 'The preview is not ready to print yet.' }
  }

  const frameWindow = frame.contentWindow
  if (!frameWindow) {
    return { ok: false, error: 'The preview is not ready to print yet.' }
  }

  try {
    frameWindow.focus()
    frameWindow.print()
    return { ok: true }
  } catch {
    return {
      ok: false,
      error:
        'The browser blocked printing from the preview. Try again, or use the browser print command.',
    }
  }
}