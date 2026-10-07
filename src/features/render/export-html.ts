import type { StyleSheet } from '@/shared/types'

import { buildDocument } from './build-document'
import { DEFAULT_STYLE_CSS, DEFAULT_STYLE_NAME } from './default-style'

/**
 * Pure helpers for exporting one resume as a standalone HTML file.
 *
 * The file is built with the same document builder the preview uses, so it
 * looks the same as the preview: the base print stylesheet, the chosen style
 * and the resume HTML are combined into one self-contained document. Nothing
 * here touches the DOM, so every helper is easy to test. The download itself
 * is handled by the shared download helper.
 */

/** The MIME type to use when downloading the exported file. */
export const EXPORT_HTML_MIME_TYPE = 'text/html;charset=utf-8'

/** The title used when a resume has no usable title. */
const FALLBACK_TITLE = 'resume'

/** The longest part of a file name taken from a title or style name. */
const MAX_NAME_PART_LENGTH = 60

/** The style an export is built with: a name and its CSS. */
export type ExportStyle = Pick<StyleSheet, 'name' | 'css'>

/** The parts a standalone resume file is built from. */
export interface ExportHtmlInput {
  /** The cleaned resume HTML saved on the session. */
  html: string
  /** The title of the resume, used for the document title and file name. */
  title: string
  /** The chosen style, or null to use the built-in style. */
  style: ExportStyle | null
}

/** The built file content and the name to save it under. */
export interface ExportHtmlFile {
  /** The complete standalone HTML document. */
  content: string
  /** A safe file name ending in .html. */
  fileName: string
}

/**
 * Turns free text into a lowercase file name part made of letters, digits and
 * single hyphens. Accents are removed, and anything else becomes a hyphen.
 * Returns an empty string when nothing usable is left.
 */
export function slugifyFileNamePart(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_NAME_PART_LENGTH)
    .replace(/-+$/g, '')

  return slug
}

/**
 * Returns a safe file name for an exported resume, built from the resume
 * title and the style name, for example "software-engineer-modern.html".
 * Falls back to "resume" when the title has nothing usable in it.
 */
export function getExportFileName(
  title: string,
  styleName: string = DEFAULT_STYLE_NAME,
): string {
  const titlePart = slugifyFileNamePart(title) || FALLBACK_TITLE
  const stylePart = slugifyFileNamePart(styleName)

  return stylePart === ''
    ? `${titlePart}.html`
    : `${titlePart}-${stylePart}.html`
}

/**
 * Builds the standalone HTML document for one resume with the chosen style
 * embedded. When no style is given, the built-in style is used.
 */
export function buildStandaloneHtml(input: ExportHtmlInput): string {
  const css = input.style?.css ?? DEFAULT_STYLE_CSS

  return buildDocument({
    html: input.html,
    styleCss: css,
    title: input.title.trim() === '' ? FALLBACK_TITLE : input.title.trim(),
  })
}

/**
 * Builds the standalone file for one resume: its content and a safe name.
 * This is everything a download needs.
 */
export function buildExportHtmlFile(input: ExportHtmlInput): ExportHtmlFile {
  return {
    content: buildStandaloneHtml(input),
    fileName: getExportFileName(
      input.title,
      input.style?.name ?? DEFAULT_STYLE_NAME,
    ),
  }
}