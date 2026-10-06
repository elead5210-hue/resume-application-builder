import type { ZodIssue, ZodType } from 'zod'

/**
 * Tolerant parser for pasted AI responses.
 *
 * The parser strips markdown code fences and stray text around the JSON,
 * parses the JSON and validates it against a zod schema. When anything goes
 * wrong it returns a list of clear, human-readable errors instead of
 * throwing.
 */

/** A successfully parsed and validated response. */
export interface ParseResponseSuccess<T> {
  ok: true
  data: T
}

/** A failed parse, with one human-readable message per problem. */
export interface ParseResponseFailure {
  ok: false
  errors: string[]
}

export type ParseResponseResult<T> =
  | ParseResponseSuccess<T>
  | ParseResponseFailure

/** Matches a fenced block and captures its inner text. */
const FENCED_BLOCK_PATTERN = /\x60{3}[^\n\x60]*\n([\s\S]*?)\x60{3}/g

/**
 * Returns the index of the bracket that closes the one at `start`, or -1 if
 * the brackets never balance. Brackets inside JSON strings are ignored.
 */
function findBalancedEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const char = text[i]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{' || char === '[') {
      depth += 1
    } else if (char === '}' || char === ']') {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
  }

  return -1
}

/**
 * Collects the pieces of text that might hold the JSON: the contents of any
 * fenced blocks first, then the whole pasted text.
 */
function collectSources(raw: string): string[] {
  const sources: string[] = []

  for (const match of raw.matchAll(FENCED_BLOCK_PATTERN)) {
    const inner = match[1]?.trim()
    if (inner) {
      sources.push(inner)
    }
  }

  sources.push(raw.trim())
  return sources
}

/**
 * Finds every balanced object or array in the text, in order of appearance.
 * Candidates that start inside an earlier candidate are skipped.
 */
function findJsonCandidates(text: string): string[] {
  const candidates: string[] = []
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (char === '{' || char === '[') {
      const end = findBalancedEnd(text, index)
      if (end !== -1) {
        candidates.push(text.slice(index, end + 1))
        index = end + 1
        continue
      }
    }

    index += 1
  }

  return candidates
}

/** Turns a zod issue path into a readable location such as items[0].label. */
function formatPath(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) {
    return 'the response'
  }

  let result = ''
  for (const segment of path) {
    if (typeof segment === 'number') {
      result += `[${segment}]`
    } else {
      result += result === '' ? segment : `.${segment}`
    }
  }
  return result
}

/** Turns one zod issue into a single readable sentence. */
function formatIssue(issue: ZodIssue): string {
  const location = formatPath(issue.path)

  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return `${location} is missing (expected ${issue.expected}).`
  }

  if (issue.code === 'invalid_type') {
    return `${location} has the wrong type: expected ${issue.expected} but got ${issue.received}.`
  }

  if (issue.code === 'invalid_enum_value') {
    return `${location} must be one of: ${issue.options.join(', ')} (got "${String(issue.received)}").`
  }

  return `${location}: ${issue.message}.`
}

/**
 * Parses a pasted AI response and validates it against the given schema.
 *
 * Returns the validated data on success, or a list of human-readable errors.
 */
export function parseResponse<T>(
  raw: string,
  schema: ZodType<T>,
): ParseResponseResult<T> {
  if (raw.trim() === '') {
    return {
      ok: false,
      errors: ['The pasted response is empty. Paste the full reply from the AI.'],
    }
  }

  const sources = collectSources(raw)
  let firstParseError: string | null = null
  let firstSchemaErrors: string[] | null = null

  for (const source of sources) {
    // The text may be clean JSON already; try it before searching inside it.
    const candidates = [source, ...findJsonCandidates(source)]

    for (const candidate of candidates) {
      let value: unknown

      try {
        value = JSON.parse(candidate)
      } catch (error) {
        if (firstParseError === null && /^[{[]/.test(candidate)) {
          firstParseError =
            error instanceof Error ? error.message : 'Unknown parse error'
        }
        continue
      }

      if (typeof value !== 'object' || value === null) {
        continue
      }

      const result = schema.safeParse(value)
      if (result.success) {
        return { ok: true, data: result.data }
      }

      if (firstSchemaErrors === null) {
        firstSchemaErrors = result.error.issues.map(formatIssue)
      }
    }
  }

  if (firstSchemaErrors !== null) {
    return {
      ok: false,
      errors: [
        'The pasted response is valid JSON but does not match the expected format:',
        ...firstSchemaErrors,
      ],
    }
  }

  if (firstParseError !== null) {
    return {
      ok: false,
      errors: [
        `The pasted response looks like JSON but could not be parsed: ${firstParseError}.`,
        'Check that the reply was copied completely and was not cut off.',
      ],
    }
  }

  return {
    ok: false,
    errors: [
      'No JSON object or array was found in the pasted response.',
      'Paste the full reply from the AI, including the opening and closing braces.',
    ],
  }
}