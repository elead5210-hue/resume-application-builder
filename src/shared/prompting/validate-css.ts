/**
 * Pure CSS validator for styles that are pasted or written by hand.
 *
 * It is not a full CSS parser. It checks the problems that would make a saved
 * style unsafe or unusable: empty input, stray HTML tags, unbalanced braces,
 * unterminated strings or comments, @import rules and url() references to
 * external resources.
 */

/** The result of validating a piece of CSS. */
export interface ValidateCssResult {
  /** True when the CSS passed every check. */
  valid: boolean
  /** One human-readable message per problem found. Empty when valid. */
  errors: string[]
}

/** Matches an @import rule. */
const IMPORT_PATTERN = /@import\b/i

/** Matches a style tag, which does not belong in plain CSS. */
const STYLE_TAG_PATTERN = /<\/?\s*style\b/i

/** Matches a url() reference and captures its quoted or unquoted argument. */
const URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s'"]*))\s*\)/gi

/** The CSS with comments removed, and whether a comment was never closed. */
interface StrippedCss {
  text: string
  unclosedComment: boolean
}

/** Removes comments, leaving comment-like text inside strings alone. */
function stripComments(css: string): StrippedCss {
  let text = ''
  let quote: string | null = null
  let index = 0

  while (index < css.length) {
    const char = css[index]

    if (quote !== null) {
      text += char
      if (char === '\\' && index + 1 < css.length) {
        text += css[index + 1]
        index += 2
        continue
      }
      if (char === quote || char === '\n') {
        quote = null
      }
      index += 1
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      text += char
      index += 1
      continue
    }

    if (char === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      if (end === -1) {
        return { text, unclosedComment: true }
      }
      text += ' '
      index = end + 2
      continue
    }

    text += char
    index += 1
  }

  return { text, unclosedComment: false }
}

/** Checks braces and strings, returning one message per problem. */
function checkStructure(css: string): string[] {
  const errors: string[] = []
  let depth = 0
  let quote: string | null = null
  let unterminatedStrings = 0
  let strayClosingBraces = 0

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index]

    if (quote !== null) {
      if (char === '\\') {
        index += 1
      } else if (char === quote) {
        quote = null
      } else if (char === '\n') {
        unterminatedStrings += 1
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
    } else if (char === '{') {
      depth += 1
    } else if (char === '}') {
      if (depth === 0) {
        strayClosingBraces += 1
      } else {
        depth -= 1
      }
    }
  }

  if (quote !== null) {
    unterminatedStrings += 1
  }

  if (strayClosingBraces > 0) {
    errors.push(
      `The CSS has ${strayClosingBraces} closing brace${
        strayClosingBraces === 1 ? '' : 's'
      } "}" with no matching opening brace "{".`,
    )
  }
  if (depth > 0) {
    errors.push(
      `The CSS has ${depth} opening brace${
        depth === 1 ? '' : 's'
      } "{" that ${depth === 1 ? 'is' : 'are'} never closed with "}".`,
    )
  }
  if (unterminatedStrings > 0) {
    errors.push(
      `The CSS has ${unterminatedStrings} string${
        unterminatedStrings === 1 ? '' : 's'
      } with no closing quote.`,
    )
  }

  return errors
}

/** Finds url() references that point at external resources. */
function findExternalUrls(css: string): string[] {
  const found: string[] = []

  for (const match of css.matchAll(URL_PATTERN)) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim()
    if (value === '' || value.startsWith('#') || /^data:/i.test(value)) {
      continue
    }
    if (!found.includes(value)) {
      found.push(value)
    }
  }

  return found
}

/**
 * Validates pasted or written CSS before it is saved as a style.
 *
 * Pure: the same input always produces the same result.
 */
export function validateCss(css: string): ValidateCssResult {
  if (css.trim() === '') {
    return { valid: false, errors: ['The CSS is empty. Add at least one rule.'] }
  }

  const errors: string[] = []

  if (STYLE_TAG_PATTERN.test(css)) {
    errors.push(
      'The CSS contains a <style> tag. Paste the CSS rules only, without HTML tags.',
    )
  }

  const { text, unclosedComment } = stripComments(css)

  if (unclosedComment) {
    errors.push('The CSS has a comment that starts with "/*" but is never closed with "*/".')
  }

  if (text.trim() === '') {
    errors.push('The CSS contains only comments. Add at least one rule.')
  } else {
    errors.push(...checkStructure(text))

    if (!text.includes('{')) {
      errors.push('The CSS has no rules. Write rules such as ".resume { color: black; }".')
    }

    if (IMPORT_PATTERN.test(text)) {
      errors.push(
        'The CSS uses @import. Imports are not allowed because a style must be fully self-contained.',
      )
    }

    for (const url of findExternalUrls(text)) {
      errors.push(
        `The CSS refers to the external resource url(${url}). Only data: URIs are allowed.`,
      )
    }
  }

  return { valid: errors.length === 0, errors }
}