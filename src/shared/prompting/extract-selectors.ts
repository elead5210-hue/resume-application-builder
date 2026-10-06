import { RESUME_CLASS_NAMES } from './resume-classes'

/** The result of comparing the classes in saved HTML with the selector contract. */
export interface SelectorComparison {
  /** Every distinct class name found in the HTML, in order of first appearance. */
  found: string[]
  /** Classes in the HTML that are not part of the selector contract. */
  unknown: string[]
  /** Contract classes that the HTML does not use. */
  unused: string[]
  /** True when the HTML uses only contract classes. */
  matchesContract: boolean
}

/** Matches a class attribute with a double-quoted, single-quoted or unquoted value. */
const CLASS_ATTRIBUTE_PATTERN =
  /\sclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi

/**
 * Extracts every distinct class name used in a piece of HTML, in order of
 * first appearance.
 *
 * This function is pure and does not need a DOM: it reads the class
 * attributes of the markup as text, so it behaves the same in the browser
 * and in tests.
 */
export function extractClassNames(html: string): string[] {
  const seen = new Set<string>()
  const classNames: string[] = []

  for (const match of html.matchAll(CLASS_ATTRIBUTE_PATTERN)) {
    const value = match[1] ?? match[2] ?? match[3] ?? ''
    for (const className of value.split(/\s+/)) {
      if (className !== '' && !seen.has(className)) {
        seen.add(className)
        classNames.push(className)
      }
    }
  }

  return classNames
}

/**
 * Compares the classes present in saved resume HTML with the selector
 * contract, reporting classes outside the contract and contract classes
 * that the HTML does not use.
 */
export function compareWithContract(html: string): SelectorComparison {
  const found = extractClassNames(html)
  const contract: ReadonlySet<string> = new Set(RESUME_CLASS_NAMES)
  const foundSet = new Set(found)

  const unknown = found.filter((className) => !contract.has(className))
  const unused = RESUME_CLASS_NAMES.filter(
    (className) => !foundSet.has(className),
  )

  return {
    found,
    unknown,
    unused,
    matchesContract: unknown.length === 0,
  }
}