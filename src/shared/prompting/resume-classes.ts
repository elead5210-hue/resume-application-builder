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