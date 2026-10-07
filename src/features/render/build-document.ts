import { DEFAULT_STYLE_CSS } from './default-style'
import { GLOBAL_PRINT_CSS } from './print-css'

/**
 * Base print stylesheet injected before any saved style. It is the global
 * print stylesheet defined in print-css.ts (A4 page, custom properties,
 * page-break rules and print-color-adjust), so any saved style can override
 * it. Kept under this name for existing callers.
 */
export const BASE_PRINT_CSS = GLOBAL_PRINT_CSS

/** The parts a preview or print document is built from. */
export interface BuildDocumentInput {
  /** The cleaned resume HTML saved on the session. */
  html: string
  /**
   * The CSS of the selected saved style. When it is missing or blank, the
   * minimal built-in style is used instead.
   */
  styleCss?: string | null
  /** Base print stylesheet placed before the style. Defaults to BASE_PRINT_CSS. */
  baseCss?: string
  /** Document title. Defaults to "Resume". */
  title?: string
}

/**
 * Content security policy for the document. It blocks scripts, network
 * requests and external resources; only inline styles and data URIs load.
 */
const DOCUMENT_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:',
].join('; ')

/** Escapes text placed inside the <title> element. */
function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Stops CSS text from closing the <style> element it is placed in. */
function escapeCss(css: string): string {
  return css.replace(/<\/(style)/gi, '<\\/$1')
}

/**
 * Combines the base print stylesheet, the selected CSS and the resume HTML
 * into one complete document string for an iframe's srcdoc.
 *
 * The base stylesheet comes first and the selected style second, so a style
 * can override the base. With no style (or a blank one) the minimal built-in
 * style is used. The function is pure: the same input always gives the same
 * document, so switching styles only needs a new srcdoc.
 */
export function buildDocument(input: BuildDocumentInput): string {
  const baseCss = input.baseCss ?? BASE_PRINT_CSS
  const hasStyle =
    typeof input.styleCss === 'string' && input.styleCss.trim() !== ''
  const styleCss = hasStyle ? (input.styleCss as string) : DEFAULT_STYLE_CSS
  const title = escapeText(input.title?.trim() || 'Resume')

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${DOCUMENT_CSP}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<style id="resume-base-css">\n${escapeCss(baseCss)}\n</style>`,
    `<style id="resume-style-css">\n${escapeCss(styleCss)}\n</style>`,
    '</head>',
    '<body>',
    input.html,
    '</body>',
    '</html>',
  ].join('\n')
}