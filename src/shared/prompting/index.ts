/**
 * Prompting module entry point.
 *
 * Prompt builders, response schemas and tolerant JSON parsers will be
 * exported from here as they are added in later goals.
 */
export { buildLoopContext } from './build-loop-context';
export type { LoopContextInput, LoopQaEntry } from './build-loop-context';
export { buildPrompt } from './build-prompt';
export { PROMPT_PREAMBLE } from './preamble';
export { sanitizeResumeHtml } from './sanitize-html';
export type { SanitizeHtmlResult } from './sanitize-html';
export { STAGE_TEMPLATES } from './templates';
export type { StageTemplateName } from './templates';
export type { PromptParts, PromptTemplate } from './types';
export {
  checklistItemSchema,
  checklistItemStatusSchema,
  checklistResponseSchema,
  finalHtmlResponseSchema,
  questionSchema,
  questionsResponseSchema,
} from './response-schemas';
export type {
  ChecklistResponse,
  FinalHtmlResponse,
  QuestionsResponse,
} from './response-schemas';
export {
  CHECKLIST_JSON_SCHEMA,
  FINAL_HTML_JSON_SCHEMA,
  QUESTIONS_JSON_SCHEMA,
} from './json-schemas';
export { parseResponse } from './parse-response';
export type {
  ParseResponseFailure,
  ParseResponseResult,
  ParseResponseSuccess,
} from './parse-response';