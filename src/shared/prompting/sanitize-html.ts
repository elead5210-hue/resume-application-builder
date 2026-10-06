import DOMPurify from 'dompurify'

import { compareWithContract } from './extract-selectors'

/** The result of sanitizing pasted resume HTML. */
export interface SanitizeHtmlResult {
  /** The cleaned HTML, safe to preview and save. */
  html: string
  /** Human-readable warnings about the pasted HTML. Empty when it was clean. */
  warnings: string[]
  /** True when sanitizing removed anything from the pasted HTML. */
  changed: boolean
}

/**
 * The only elements the resume HTML may contain. Scripts, styles, links,
 * images, frames, forms and every other element that can run code or load an
 * external resource are left out.
 */
const ALLOWED_TAGS = [
  'article',
  'div',
  'header',
  'section',
  'h1',
  'h2',
  'h3',
  'p',
  'ul',
  'ol',
  'li',
  'span',
  'time',
  'strong',
  'em',
  'br',
]

/**
 * The only attributes the resume HTML may carry. Event handlers, inline
 * styles, URLs and data attributes are not allowed.
 */
const ALLOWED_ATTR = ['class', 'datetime']

/** Matches an inline style attribute on any element. */
const STYLE_ATTRIBUTE_PATTERN = /\sstyle\s*=/i

/** Matches the start of a style element. */
const STYLE_TAG_PATTERN = /<style[\s>]/i

/** Joins class names into a readable list such as ".a, .b". */
function formatClassList(classNames: ReadonlyArray<string>): string {
  return classNames.map((className) => `.${className}`).join(', ')
}

/**
 * Runs pasted resume HTML through DOMPurify with a strict allowlist and
 * reports problems the user should know about before saving.
 *
 * The returned warnings cover inline styles and style elements in the pasted
 * HTML, anything the sanitizer had to remove, and classes in the cleaned
 * HTML that are not part of the selector contract.
 */
export function sanitizeResumeHtml(rawHtml: string): SanitizeHtmlResult {
  const warnings: string[] = []

  if (STYLE_ATTRIBUTE_PATTERN.test(rawHtml)) {
    warnings.push(
      'The HTML contains inline style attributes. They were removed, because all styling is applied from saved styles.',
    )
  }

  if (STYLE_TAG_PATTERN.test(rawHtml)) {
    warnings.push(
      'The HTML contains style elements. They were removed, because all styling is applied from saved styles.',
    )
  }

  const html = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })

  const removedCount = DOMPurify.removed.length
  if (removedCount > 0) {
    warnings.push(
      `The sanitizer removed ${removedCount} disallowed element${
        removedCount === 1 ? '' : 's'
      } or attribute${removedCount === 1 ? '' : 's'}, such as scripts, event handlers or external resources.`,
    )
  }

  const { unknown } = compareWithContract(html)
  if (unknown.length > 0) {
    warnings.push(
      `The HTML uses classes outside the selector contract, so saved styles will not target them: ${formatClassList(unknown)}.`,
    )
  }

  return {
    html,
    warnings,
    changed: removedCount > 0,
  }
}