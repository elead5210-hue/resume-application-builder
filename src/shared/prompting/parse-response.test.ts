import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { parseResponse } from './parse-response'

const schema = z.object({
  name: z.string(),
  count: z.number(),
})

const valid = { name: 'Resume', count: 3 }
const validJson = JSON.stringify(valid)

const FENCE = '```'

function expectSuccess<T>(result: ReturnType<typeof parseResponse<T>>): T {
  if (!result.ok) {
    throw new Error(`Expected success but got errors: ${result.errors.join(' | ')}`)
  }
  return result.data
}

function expectFailure<T>(result: ReturnType<typeof parseResponse<T>>): string[] {
  if (result.ok) {
    throw new Error('Expected failure but the parse succeeded')
  }
  return result.errors
}

describe('parseResponse', () => {
  describe('raw JSON', () => {
    it('parses a plain JSON object', () => {
      const data = expectSuccess(parseResponse(validJson, schema))

      expect(data).toEqual(valid)
    })

    it('parses JSON with surrounding whitespace and newlines', () => {
      const data = expectSuccess(parseResponse(`\n\n   ${validJson}   \n`, schema))

      expect(data).toEqual(valid)
    })

    it('parses pretty-printed JSON', () => {
      const data = expectSuccess(parseResponse(JSON.stringify(valid, null, 2), schema))

      expect(data).toEqual(valid)
    })

    it('parses a JSON array when the schema expects an array', () => {
      const data = expectSuccess(parseResponse('[1, 2, 3]', z.array(z.number())))

      expect(data).toEqual([1, 2, 3])
    })
  })

  describe('code fences', () => {
    it('parses JSON inside a fence labelled json', () => {
      const raw = `${FENCE}json\n${validJson}\n${FENCE}`

      const data = expectSuccess(parseResponse(raw, schema))

      expect(data).toEqual(valid)
    })

    it('parses JSON inside a fence without a language label', () => {
      const raw = `${FENCE}\n${validJson}\n${FENCE}`

      const data = expectSuccess(parseResponse(raw, schema))

      expect(data).toEqual(valid)
    })

    it('parses a fenced block surrounded by chatty text', () => {
      const raw = [
        'Sure! Here is the JSON you asked for:',
        '',
        `${FENCE}json`,
        JSON.stringify(valid, null, 2),
        FENCE,
        '',
        'Let me know if you want any changes.',
      ].join('\n')

      const data = expectSuccess(parseResponse(raw, schema))

      expect(data).toEqual(valid)
    })
  })

  describe('stray surrounding text', () => {
    it('finds JSON after leading text', () => {
      const data = expectSuccess(parseResponse(`Here you go: ${validJson}`, schema))

      expect(data).toEqual(valid)
    })

    it('finds JSON before trailing text', () => {
      const data = expectSuccess(parseResponse(`${validJson}\n\nHope this helps!`, schema))

      expect(data).toEqual(valid)
    })

    it('finds JSON between leading and trailing text', () => {
      const raw = `Result below.\n${validJson}\nThanks for asking.`

      const data = expectSuccess(parseResponse(raw, schema))

      expect(data).toEqual(valid)
    })

    it('is not confused by braces inside string values', () => {
      const tricky = { name: 'a } b { c', count: 1 }
      const raw = `Answer: ${JSON.stringify(tricky)} -- done`

      const data = expectSuccess(parseResponse(raw, schema))

      expect(data).toEqual(tricky)
    })

    it('is not confused by escaped quotes inside string values', () => {
      const tricky = { name: 'she said "hi" }', count: 2 }
      const raw = `Here: ${JSON.stringify(tricky)}`

      const data = expectSuccess(parseResponse(raw, schema))

      expect(data).toEqual(tricky)
    })
  })

  describe('empty input', () => {
    it('fails for an empty string', () => {
      const errors = expectFailure(parseResponse('', schema))

      expect(errors.length).toBeGreaterThan(0)
      for (const error of errors) {
        expect(typeof error).toBe('string')
        expect(error.trim().length).toBeGreaterThan(0)
      }
    })

    it('fails for whitespace only', () => {
      const errors = expectFailure(parseResponse('   \n\t  ', schema))

      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('invalid JSON', () => {
    it('fails for text with no JSON in it', () => {
      const errors = expectFailure(parseResponse('I could not produce that, sorry.', schema))

      expect(errors.length).toBeGreaterThan(0)
    })

    it('fails for malformed JSON', () => {
      const errors = expectFailure(parseResponse('{"name": "Resume", "count": }', schema))

      expect(errors.length).toBeGreaterThan(0)
    })

    it('fails for truncated JSON', () => {
      const errors = expectFailure(parseResponse('{"name": "Resume", "count": 3', schema))

      expect(errors.length).toBeGreaterThan(0)
    })

    it('fails for a fenced block that holds invalid JSON', () => {
      const raw = `${FENCE}json\n{ name: 'Resume', }\n${FENCE}`

      const errors = expectFailure(parseResponse(raw, schema))

      expect(errors.length).toBeGreaterThan(0)
    })

    it('does not throw on odd input', () => {
      const inputs = ['{', '}', '[', ']', '{{{{', '"', FENCE, `${FENCE}json`, 'null']

      for (const input of inputs) {
        expect(() => parseResponse(input, schema)).not.toThrow()
      }
    })
  })

  describe('schema errors', () => {
    it('fails when a required field is missing and names the field', () => {
      const errors = expectFailure(parseResponse('{"name": "Resume"}', schema))

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.join('\n')).toContain('count')
    })

    it('fails when a field has the wrong type and names the field', () => {
      const errors = expectFailure(parseResponse('{"name": "Resume", "count": "three"}', schema))

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.join('\n')).toContain('count')
    })

    it('reports one message per problem', () => {
      const errors = expectFailure(parseResponse('{"name": 5, "count": "x"}', schema))

      expect(errors.length).toBeGreaterThanOrEqual(2)
      const joined = errors.join('\n')
      expect(joined).toContain('name')
      expect(joined).toContain('count')
    })

    it('reports readable string messages', () => {
      const errors = expectFailure(parseResponse('{"name": 5, "count": "x"}', schema))

      for (const error of errors) {
        expect(typeof error).toBe('string')
        expect(error.trim().length).toBeGreaterThan(0)
        expect(error).not.toContain('[object Object]')
      }
    })

    it('names the location of a problem in a nested structure', () => {
      const nested = z.object({
        items: z.array(z.object({ label: z.string() })),
      })

      const errors = expectFailure(parseResponse('{"items": [{"label": 1}]}', nested))

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.join('\n')).toContain('items')
    })

    it('fails when valid JSON does not match the schema, even inside a fence', () => {
      const raw = `${FENCE}json\n{"unexpected": true}\n${FENCE}`

      const errors = expectFailure(parseResponse(raw, schema))

      expect(errors.length).toBeGreaterThan(0)
    })

    it('fails when the JSON root has the wrong shape', () => {
      const errors = expectFailure(parseResponse('[1, 2, 3]', schema))

      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('result shape', () => {
    it('returns ok true with data on success', () => {
      const result = parseResponse(validJson, schema)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual(valid)
      }
    })

    it('returns ok false with errors on failure', () => {
      const result = parseResponse('nope', schema)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(Array.isArray(result.errors)).toBe(true)
      }
    })

    it('gives the same result for the same input', () => {
      const first = parseResponse(`text ${validJson} text`, schema)
      const second = parseResponse(`text ${validJson} text`, schema)

      expect(second).toEqual(first)
    })
  })
})