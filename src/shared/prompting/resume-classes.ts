/**
 * The fixed set of class names the final resume HTML must use.
 *
 * The final HTML prompt asks the AI to use only these class names, and saved
 * styles target the same names, so both sides share one vocabulary.
 */
export const RESUME_CLASS_NAMES = [
  'resume',
  'resume-header',
  'resume-name',
  'resume-title',
  'resume-contact',
  'resume-contact-item',
  'resume-section',
  'resume-section-title',
  'resume-summary',
  'resume-entry',
  'resume-entry-header',
  'resume-entry-title',
  'resume-entry-org',
  'resume-entry-dates',
  'resume-entry-location',
  'resume-entry-list',
  'resume-skills',
  'resume-skill',
  'resume-education',
  'resume-achievements',
] as const

/** One class name from the fixed resume vocabulary. */
export type ResumeClassName = (typeof RESUME_CLASS_NAMES)[number]

/**
 * Version of the selector contract. Increase it whenever a class name or the
 * expected structure below changes, so saved HTML and saved styles can be
 * checked against the contract they were written for.
 */
export const SELECTOR_CONTRACT_VERSION = 1

/** One entry of the selector contract: a class name and where it belongs. */
export interface SelectorContractEntry {
  /** The class name the final HTML uses and styles target. */
  className: ResumeClassName
  /** The HTML elements the class is expected on. */
  elements: readonly string[]
  /** The class of the element this one sits directly inside, or null for the root. */
  parent: ResumeClassName | null
  /** What the element holds, in one line. */
  description: string
}

/**
 * The versioned selector contract shared by the final HTML prompt and the
 * styling prompt: every class name together with its expected element and
 * its place in the resume structure.
 */
export const SELECTOR_CONTRACT: {
  version: number
  structure: readonly SelectorContractEntry[]
} = {
  version: SELECTOR_CONTRACT_VERSION,
  structure: [
    {
      className: 'resume',
      elements: ['article', 'div'],
      parent: null,
      description: 'Root element that wraps the whole resume.',
    },
    {
      className: 'resume-header',
      elements: ['header'],
      parent: 'resume',
      description: 'Top block with the name, title and contact details.',
    },
    {
      className: 'resume-name',
      elements: ['h1'],
      parent: 'resume-header',
      description: 'The full name of the person.',
    },
    {
      className: 'resume-title',
      elements: ['p'],
      parent: 'resume-header',
      description: 'The professional title or headline.',
    },
    {
      className: 'resume-contact',
      elements: ['ul'],
      parent: 'resume-header',
      description: 'List of contact details.',
    },
    {
      className: 'resume-contact-item',
      elements: ['li'],
      parent: 'resume-contact',
      description: 'One contact detail, such as an email or phone number.',
    },
    {
      className: 'resume-section',
      elements: ['section'],
      parent: 'resume',
      description: 'A titled section of the resume.',
    },
    {
      className: 'resume-section-title',
      elements: ['h2'],
      parent: 'resume-section',
      description: 'The heading of a section.',
    },
    {
      className: 'resume-summary',
      elements: ['p'],
      parent: 'resume-section',
      description: 'A short summary paragraph.',
    },
    {
      className: 'resume-entry',
      elements: ['article', 'div'],
      parent: 'resume-section',
      description: 'One entry in a section, such as a job or a degree.',
    },
    {
      className: 'resume-entry-header',
      elements: ['header', 'div'],
      parent: 'resume-entry',
      description: 'Heading block of an entry with its title, organisation, dates and location.',
    },
    {
      className: 'resume-entry-title',
      elements: ['h3'],
      parent: 'resume-entry-header',
      description: 'The title of an entry, such as a job title.',
    },
    {
      className: 'resume-entry-org',
      elements: ['p', 'span'],
      parent: 'resume-entry-header',
      description: 'The organisation of an entry, such as the employer.',
    },
    {
      className: 'resume-entry-dates',
      elements: ['time', 'span'],
      parent: 'resume-entry-header',
      description: 'The dates of an entry.',
    },
    {
      className: 'resume-entry-location',
      elements: ['p', 'span'],
      parent: 'resume-entry-header',
      description: 'The location of an entry.',
    },
    {
      className: 'resume-entry-list',
      elements: ['ul'],
      parent: 'resume-entry',
      description: 'Bullet points describing the entry.',
    },
    {
      className: 'resume-skills',
      elements: ['ul'],
      parent: 'resume-section',
      description: 'List of skills.',
    },
    {
      className: 'resume-skill',
      elements: ['li'],
      parent: 'resume-skills',
      description: 'One skill.',
    },
    {
      className: 'resume-education',
      elements: ['section'],
      parent: 'resume',
      description: 'Optional wrapper for the education section.',
    },
    {
      className: 'resume-achievements',
      elements: ['ul'],
      parent: 'resume-section',
      description: 'List of achievements.',
    },
  ],
}