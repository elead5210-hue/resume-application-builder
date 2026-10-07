import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import {
  checklistItemSchema,
  checklistItemStatusSchema,
  checklistResponseSchema,
  finalHtmlResponseSchema,
  questionSchema,
  questionsResponseSchema,
} from './response-schemas'

/**
 * These tests build a valid sample for each schema from the schema itself, so
 * they check how the schemas behave (accept valid, reject malformed) without
 * repeating the field lists in a second place.
 */

interface Def {
  typeName?: string
  [key: string]: unknown
}

interface StringCheck {
  kind: string
  value?: number
}

interface LengthLimit {
  value: number
}

function defOf(schema: z.ZodTypeAny): Def {
  return schema._def as Def
}

/** Strips optional, nullable, default and effects wrappers. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema
  for (;;) {
    const def = defOf(current)
    switch (def.typeName) {
      case 'ZodOptional':
      case 'ZodNullable':
      case 'ZodDefault':
      case 'ZodReadonly':
      case 'ZodCatch':
        current = def.innerType as z.ZodTypeAny
        break
      case 'ZodEffects':
        current = def.schema as z.ZodTypeAny
        break
      case 'ZodBranded':
        current = def.type as z.ZodTypeAny
        break
      default:
        return current
    }
  }
}

function sampleString(def: Def): string {
  const checks = (def.checks as StringCheck[] | undefined) ?? []
  if (checks.some((check) => check.kind === 'email')) {
    return 'person@example.com'
  }
  if (checks.some((check) => check.kind === 'url')) {
    return 'https://example.com'
  }
  let length = 'sample text'.length
  for (const check of checks) {
    if ((check.kind === 'min' || check.kind === 'length') && typeof check.value === 'number') {
      length = Math.max(length, check.value)
    }
  }
  return 'sample text'.padEnd(length, 'x')
}

function sampleNumber(def: Def): number {
  const checks = (def.checks as StringCheck[] | undefined) ?? []
  let value = 1
  for (const check of checks) {
    if (check.kind === 'min' && typeof check.value === 'number') {
      value = Math.max(value, Math.ceil(check.value))
    }
  }
  for (const check of checks) {
    if (check.kind === 'max' && typeof check.value === 'number') {
      value = Math.min(value, Math.floor(check.value))
    }
  }
  return value
}

/** Builds a value that satisfies the schema. */
function sampleFor(schema: z.ZodTypeAny): unknown {
  const inner = unwrap(schema)
  const def = defOf(inner)

  switch (def.typeName) {
    case 'ZodString':
      return sampleString(def)
    case 'ZodNumber':
      return sampleNumber(def)
    case 'ZodBoolean':
      return true
    case 'ZodEnum':
      return (def.values as unknown[])[0]
    case 'ZodLiteral':
      return def.value
    case 'ZodArray': {
      const exact = def.exactLength as LengthLimit | null | undefined
      const min = def.minLength as LengthLimit | null | undefined
      const count = Math.max(1, exact?.value ?? min?.value ?? 1)
      const item = def.type as z.ZodTypeAny
      return Array.from({ length: count }, () => sampleFor(item))
    }
    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, z.ZodTypeAny>)()
      const result: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(shape)) {
        result[key] = sampleFor(field)
      }
      return result
    }
    case 'ZodUnion':
      return sampleFor((def.options as z.ZodTypeAny[])[0])
    case 'ZodRecord':
      return {}
    case 'ZodAny':
    case 'ZodUnknown':
      return 'sample text'
    default:
      throw new Error(`Cannot build a sample for schema type ${String(def.typeName)}`)
  }
}

function shapeOf(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  const inner = unwrap(schema)
  const def = defOf(inner)
  if (def.typeName !== 'ZodObject') {
    throw new Error('Expected an object schema')
  }
  return (def.shape as () => Record<string, z.ZodTypeAny>)()
}

const WRONG_VALUE = { notTheRightType: true }

const objectSchemas: Array<{ name: string; schema: z.ZodTypeAny }> = [
  { name: 'checklistItemSchema', schema: checklistItemSchema },
  { name: 'checklistResponseSchema', schema: checklistResponseSchema },
  { name: 'questionSchema', schema: questionSchema },
  { name: 'questionsResponseSchema', schema: questionsResponseSchema },
  { name: 'finalHtmlResponseSchema', schema: finalHtmlResponseSchema },
]

describe.each(objectSchemas)('$name', ({ schema }) => {
  it('accepts a valid response', () => {
    const sample = sampleFor(schema)

    const result = schema.safeParse(sample)

    expect(result.success).toBe(true)
  })

  it('accepts a valid response that went through JSON', () => {
    const sample = JSON.parse(JSON.stringify(sampleFor(schema))) as unknown

    expect(schema.safeParse(sample).success).toBe(true)
  })

  it('does not throw on any input', () => {
    const inputs: unknown[] = [null, undefined, 'text', 42, true, [], {}, [{}]]

    for (const input of inputs) {
      expect(() => schema.safeParse(input)).not.toThrow()
    }
  })

  it('rejects values that are not objects', () => {
    const inputs: unknown[] = [null, undefined, 'text', 42, true, []]

    for (const input of inputs) {
      expect(schema.safeParse(input).success).toBe(false)
    }
  })

  it('rejects an empty object', () => {
    expect(schema.safeParse({}).success).toBe(false)
  })

  it('rejects a response that is missing a required field', () => {
    const shape = shapeOf(schema)
    const requiredKeys = Object.keys(shape).filter((key) => !shape[key].isOptional())

    expect(requiredKeys.length).toBeGreaterThan(0)

    for (const key of requiredKeys) {
      const sample = { ...(sampleFor(schema) as Record<string, unknown>) }
      delete sample[key]

      const result = schema.safeParse(sample)

      expect(result.success, `missing field "${key}" should be rejected`).toBe(false)
    }
  })

  it('rejects a response where a required field is null', () => {
    const shape = shapeOf(schema)

    for (const [key, field] of Object.entries(shape)) {
      if (field.isOptional() || field.isNullable()) {
        continue
      }
      const sample = { ...(sampleFor(schema) as Record<string, unknown>), [key]: null }

      expect(schema.safeParse(sample).success, `null for "${key}" should be rejected`).toBe(false)
    }
  })

  it('rejects a response where a field has the wrong type', () => {
    const shape = shapeOf(schema)
    let checked = 0

    for (const [key, field] of Object.entries(shape)) {
      if (field.safeParse(WRONG_VALUE).success) {
        continue
      }
      const sample = { ...(sampleFor(schema) as Record<string, unknown>), [key]: WRONG_VALUE }

      expect(schema.safeParse(sample).success, `wrong type for "${key}" should be rejected`).toBe(
        false,
      )
      checked += 1
    }

    expect(checked).toBeGreaterThan(0)
  })

  it('reports the failing field in the issue path', () => {
    const shape = shapeOf(schema)
    const requiredKeys = Object.keys(shape).filter((key) => !shape[key].isOptional())
    const key = requiredKeys[0]
    const sample = { ...(sampleFor(schema) as Record<string, unknown>) }
    delete sample[key]

    const result = schema.safeParse(sample)

    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0])
      expect(paths).toContain(key)
    }
  })
})

describe('checklistItemStatusSchema', () => {
  it('accepts a valid status', () => {
    expect(checklistItemStatusSchema.safeParse(sampleFor(checklistItemStatusSchema)).success).toBe(
      true,
    )
  })

  it('rejects an unknown status', () => {
    expect(checklistItemStatusSchema.safeParse('definitely-not-a-status').success).toBe(false)
  })

  it('rejects values that are not strings', () => {
    const inputs: unknown[] = [null, undefined, 42, true, [], {}]

    for (const input of inputs) {
      expect(checklistItemStatusSchema.safeParse(input).success).toBe(false)
    }
  })
})

describe('array responses', () => {
  it('rejects a checklist response whose list holds malformed items', () => {
    const sample = sampleFor(checklistResponseSchema) as Record<string, unknown>
    const shape = shapeOf(checklistResponseSchema)
    const arrayKeys = Object.keys(shape).filter(
      (key) => defOf(unwrap(shape[key])).typeName === 'ZodArray',
    )

    expect(arrayKeys.length).toBeGreaterThan(0)

    for (const key of arrayKeys) {
      const broken = { ...sample, [key]: [WRONG_VALUE] }
      const itemSchema = defOf(unwrap(shape[key])).type as z.ZodTypeAny

      if (itemSchema.safeParse(WRONG_VALUE).success) {
        continue
      }

      expect(checklistResponseSchema.safeParse(broken).success).toBe(false)
    }
  })

  it('rejects a questions response whose list holds malformed questions', () => {
    const sample = sampleFor(questionsResponseSchema) as Record<string, unknown>
    const shape = shapeOf(questionsResponseSchema)
    const arrayKeys = Object.keys(shape).filter(
      (key) => defOf(unwrap(shape[key])).typeName === 'ZodArray',
    )

    expect(arrayKeys.length).toBeGreaterThan(0)

    for (const key of arrayKeys) {
      const broken = { ...sample, [key]: [WRONG_VALUE] }
      const itemSchema = defOf(unwrap(shape[key])).type as z.ZodTypeAny

      if (itemSchema.safeParse(WRONG_VALUE).success) {
        continue
      }

      expect(questionsResponseSchema.safeParse(broken).success).toBe(false)
    }
  })
})