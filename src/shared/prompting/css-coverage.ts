import { RESUME_CLASS_NAMES } from './resume-classes'

/**
 * Pure coverage check for a saved style.
 *
 * It looks at the class selectors a style's CSS targets and compares them with
 * the selector contract, so the user can see which contract classes the style
 * does not cover and which selectors fall outside the contract.
 */

/** The result of comparing a style's CSS with the selector contract. */
export interface CssCoverage {
  /** Every distinct class the CSS targets in a selector, in order of first use. */
  usedClasses: string[]
  /** Contract classes the CSS targets at least once, in contract order. */
  coveredClasses: string[]
  /** Contract classes the CSS never targets, in contract order. */
  uncoveredClasses: string[]
  /** Classes the CSS targets that are not part of the contract. */
  unknownClasses: string[]
  /** Share of contract classes the CSS covers, from 0 to 100. */
  coveragePercent: number
}

/** At-rules whose block holds ordinary rules that contain selectors. */
const NESTING_AT_RULES: readonly string[] = [
  'media',
  'supports',
  'layer',
  'container',
  'document',
  'scope',
]

/** Matches a class selector and captures the class name. */
const CLASS_SELECTOR_PATTERN = /\.(-?[_a-zA-Z][\w-]*)/g

/** Removes comments and blanks out the content of strings. */
function sanitize(css: string): string {
  let text = ''
  let quote: string | null = null
  let index = 0

  while (index < css.length) {
    const char = css[index]

    if (quote !== null) {
      if (char === '\\') {
        index += 2
        continue
      }
      if (char === quote) {
        quote = null
        text += char
      } else if (char === '\n') {
        quote = null
        text += char
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
        break
      }
      text += ' '
      index = end + 2
      continue
    }

    text += char
    index += 1
  }

  return text
}

/** Returns the index of the brace that closes the one opened at openIndex. */
function findBlockEnd(text: string, openIndex: number): number {
  let depth = 0

  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === '{') {
      depth += 1
    } else if (text[index] === '}') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return text.length
}

/** Collects the selector text in front of every ordinary rule block. */
function extractSelectorPreludes(text: string): string[] {
  const preludes: string[] = []
  let start = 0
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (char === '{') {
      const prelude = text.slice(start, index).trim()

      if (prelude.startsWith('@')) {
        const name = /^@([a-zA-Z-]+)/.exec(prelude)?.[1]?.toLowerCase() ?? ''
        if (NESTING_AT_RULES.includes(name)) {
          start = index + 1
          index += 1
          continue
        }
      } else if (prelude !== '') {
        preludes.push(prelude)
      }

      index = findBlockEnd(text, index) + 1
      start = index
      continue
    }

    if (char === '}' || char === ';') {
      start = index + 1
    }
    index += 1
  }

  return preludes
}

/** Lists the distinct classes targeted by the selectors in a piece of CSS. */
function extractUsedClasses(css: string): string[] {
  const used: string[] = []

  for (const prelude of extractSelectorPreludes(sanitize(css))) {
    for (const match of prelude.matchAll(CLASS_SELECTOR_PATTERN)) {
      const className = match[1]
      if (!used.includes(className)) {
        used.push(className)
      }
    }
  }

  return used
}

/**
 * Checks which selector contract classes a style's CSS covers.
 *
 * Pure: the same input always produces the same result.
 */
export function analyzeCssCoverage(css: string): CssCoverage {
  const usedClasses = extractUsedClasses(css)
  const contractClasses: readonly string[] = RESUME_CLASS_NAMES

  const coveredClasses = contractClasses.filter((className) =>
    usedClasses.includes(className),
  )
  const uncoveredClasses = contractClasses.filter(
    (className) => !usedClasses.includes(className),
  )
  const unknownClasses = usedClasses.filter(
    (className) => !contractClasses.includes(className),
  )
  const coveragePercent =
    contractClasses.length === 0
      ? 100
      : Math.round((coveredClasses.length / contractClasses.length) * 100)

  return {
    usedClasses,
    coveredClasses,
    uncoveredClasses,
    unknownClasses,
    coveragePercent,
  }
}