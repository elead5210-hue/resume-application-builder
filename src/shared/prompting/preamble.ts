/**
 * Shared preamble prepended to every prompt.
 *
 * Keeping the wording here means the "raw JSON only" rule is tuned in one
 * place for every stage.
 */
export const PROMPT_PREAMBLE: string = [
  'Reply with raw JSON only.',
  'Do not wrap the JSON in markdown code fences.',
  'Do not add any commentary, explanation, introduction or closing remark before or after the JSON.',
  'The reply must be a single valid JSON value that matches the required JSON schema given below.',
].join('\n');