import {
  RESUME_CLASS_NAMES,
  SELECTOR_CONTRACT,
  SELECTOR_CONTRACT_VERSION,
} from './resume-classes'

/** The data the styling prompt is built from. */
export interface StyleContextInput {
  /** The look the user wants, in their own words (for example "minimal, two-column"). */
  lookDescription: string
}

/**
 * The selector contract structure as one line per class: the class name, the
 * elements it goes on, where it sits, and what it holds.
 */
const CONTRACT_STRUCTURE_TEXT = SELECTOR_CONTRACT.structure
  .map(
    (entry) =>
      `- ${entry.className} (${entry.elements.join(' or ')}, ${
        entry.parent === null ? 'root element' : `directly inside ${entry.parent}`
      }): ${entry.description}`,
  )
  .join('\n')

/**
 * Serializes the user's look description and the selector contract (its
 * version, the allowed class names and the expected structure) into the
 * context text passed to buildPrompt for the styling prompt.
 *
 * Pure: the same input always produces the same text.
 */
export function buildStyleContext(input: StyleContextInput): string {
  const lookDescription = input.lookDescription.trim()

  return [
    'Requested look:',
    lookDescription === '' ? '(no description provided)' : lookDescription,
    '',
    `Selector contract version: ${SELECTOR_CONTRACT_VERSION}`,
    '',
    'Class names the CSS may target:',
    RESUME_CLASS_NAMES.join(', '),
    '',
    'Resume HTML structure:',
    CONTRACT_STRUCTURE_TEXT,
  ].join('\n')
}