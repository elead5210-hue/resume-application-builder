import { PROMPT_PREAMBLE } from './preamble';
import type { PromptParts } from './types';

/**
 * Assembles one prompt string from the shared preamble and the three prompt
 * parts: the instruction, the user's context and the required JSON schema.
 *
 * This function is pure: the same input always produces the same output and
 * nothing outside the function is read or changed.
 */
export function buildPrompt(parts: PromptParts): string {
  const { instruction, context, schema } = parts;

  return [
    PROMPT_PREAMBLE,
    '## Instruction',
    instruction,
    '## Context',
    context,
    '## Required JSON schema',
    schema,
  ].join('\n\n');
}