import {
  RESUME_CLASS_NAMES,
  SELECTOR_CONTRACT,
  SELECTOR_CONTRACT_VERSION,
} from './resume-classes';
import type { PromptTemplate } from './types';

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
  .join('\n');

/**
 * One instruction template per stage of a resume session.
 *
 * Keeping the wording here means each stage's instruction is tuned in one
 * place, without touching the prompt builder.
 */
export const STAGE_TEMPLATES = {
  jobContext: {
    instruction: [
      'You are helping the user build a resume tailored to a specific job.',
      'Read the job information given in the context and extract the job context the rest of the session will rely on.',
      'Base your answer only on the information in the context and do not invent details that are not present.',
      'Return your answer in the structure described by the required JSON schema.',
    ].join('\n'),
  },
  checklistSetup: {
    instruction: [
      'You are helping the user build a resume tailored to a specific job.',
      'Using the job context given in the context, create a checklist of the items the resume must cover.',
      'Keep every checklist item specific, relevant to the job and checkable against the information the user provides.',
      'Return your answer in the structure described by the required JSON schema.',
    ].join('\n'),
  },
  questionLoop: {
    instruction: [
      'You are helping the user build a resume tailored to a specific job.',
      'Using the job context, the current checklist and the recent questions and answers given in the context, decide which checklist items are still not covered.',
      'Ask only 1 or 2 questions at a time, and do not repeat a question that has already been answered.',
      'Mark a checklist item as "complete" only when you are satisfied with the answers the user has given for it; use "in_progress" for an item that has been started but is not yet fully covered.',
      'If an answer is vague, incomplete or raises new details worth capturing, ask a follow-up question about the same item before moving on to another one.',
      'Return both the next questions and the full updated checklist, including every item with its current status and not only the items that changed.',
      'Return your answer in the structure described by the required JSON schema.',
    ].join('\n'),
  },
  finalHtml: {
    instruction: [
      'You are helping the user build a resume tailored to a specific job.',
      'Using the job context, the full question and answer history and the checklist given in the context, produce the final resume as HTML.',
      'Use semantic HTML only, such as header, section, h1, h2, h3, p, ul, li and time elements.',
      'Do not use inline style attributes and do not include any style tags or link tags; all styling is applied separately.',
      `Follow selector contract version ${SELECTOR_CONTRACT_VERSION}.`,
      `Use only these class names, and only where they fit: ${RESUME_CLASS_NAMES.join(', ')}.`,
      `Structure the HTML as described below, where each line gives a class name, the elements it goes on, where it sits and what it holds:\n${CONTRACT_STRUCTURE_TEXT}`,
      'Put the whole resume inside a single element with the class "resume" and return only the HTML for that element, not a full document with html, head or body tags.',
      'Use only facts the user has provided and do not invent experience, skills or achievements.',
      'Place the HTML string in the "html" field of the JSON response.',
      'Return your answer in the structure described by the required JSON schema.',
    ].join('\n'),
  },
} satisfies Record<string, PromptTemplate>;

/**
 * The name of a stage that has an instruction template.
 */
export type StageTemplateName = keyof typeof STAGE_TEMPLATES;