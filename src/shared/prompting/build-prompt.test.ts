import { describe, expect, it } from 'vitest'

import { buildPrompt } from './build-prompt'
import { PROMPT_PREAMBLE } from './preamble'
import type { PromptParts } from './types'

const parts: PromptParts = {
  instruction: 'INSTRUCTION-MARKER: write the checklist for this job.',
  context: 'CONTEXT-MARKER: the job is a senior frontend engineer role.',
  schema: 'SCHEMA-MARKER: {"type":"object","properties":{"items":{"type":"array"}}}',
}

describe('buildPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildPrompt(parts)

    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('includes the shared preamble', () => {
    const prompt = buildPrompt(parts)

    expect(PROMPT_PREAMBLE.length).toBeGreaterThan(0)
    expect(prompt).toContain(PROMPT_PREAMBLE)
  })

  it('includes the instruction', () => {
    const prompt = buildPrompt(parts)

    expect(prompt).toContain(parts.instruction)
  })

  it('includes the context', () => {
    const prompt = buildPrompt(parts)

    expect(prompt).toContain(parts.context)
  })

  it('includes the schema', () => {
    const prompt = buildPrompt(parts)

    expect(prompt).toContain(parts.schema)
  })

  it('gives the same output for the same input', () => {
    const first = buildPrompt(parts)
    const second = buildPrompt({ ...parts })

    expect(second).toBe(first)
  })

  it('changes the output when a part changes', () => {
    const original = buildPrompt(parts)
    const changed = buildPrompt({
      ...parts,
      context: 'CONTEXT-MARKER: a different job entirely.',
    })

    expect(changed).not.toBe(original)
    expect(changed).toContain('a different job entirely.')
    expect(changed).not.toContain(parts.context)
  })

  it('does not modify the parts it is given', () => {
    const input: PromptParts = { ...parts }

    buildPrompt(input)

    expect(input).toEqual(parts)
  })
})