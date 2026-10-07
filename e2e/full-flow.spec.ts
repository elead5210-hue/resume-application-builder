import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { z } from 'zod'

import { RESUME_CLASS_NAMES } from '../src/shared/prompting/resume-classes'
import * as responseSchemas from '../src/shared/prompting/response-schemas'

/**
 * Full flow with mocked AI responses.
 *
 * The app has no backend: the user copies a prompt, runs it in an AI tool and
 * pastes the answer back. So the "AI" here is simply the text this test pastes.
 * The mocked responses are built from the app's own zod schemas, so this test
 * does not repeat the field lists of the AI responses.
 */

interface Def {
  typeName?: string
  [key: string]: unknown
}

interface Check {
  kind: string
  value?: number
}

interface LengthLimit {
  value: number
}

function defOf(schema: z.ZodTypeAny): Def {
  return schema._def as Def
}

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

const RESUME_HTML = [
  `<div class="${RESUME_CLASS_NAMES.join(' ')}">`,
  '<h1>E2E Candidate</h1>',
  '<p>Senior frontend engineer.</p>',
  '</div>',
].join('')

const VALID_CSS = '.resume { font-family: Georgia, serif; color: #111; }'

function sampleString(def: Def, key: string, label: string): string {
  if (/html/i.test(key)) {
    return RESUME_HTML
  }
  if (/css/i.test(key)) {
    return VALID_CSS
  }
  const checks = (def.checks as Check[] | undefined) ?? []
  if (checks.some((check) => check.kind === 'email')) {
    return 'person@example.com'
  }
  if (checks.some((check) => check.kind === 'url')) {
    return 'https://example.com'
  }
  let length = label.length
  for (const check of checks) {
    if ((check.kind === 'min' || check.kind === 'length') && typeof check.value === 'number') {
      length = Math.max(length, check.value)
    }
  }
  return label.padEnd(length, 'x')
}

function sampleFor(schema: z.ZodTypeAny, key: string, label: string): unknown {
  const inner = unwrap(schema)
  const def = defOf(inner)

  switch (def.typeName) {
    case 'ZodString':
      return sampleString(def, key, label)
    case 'ZodNumber': {
      const checks = (def.checks as Check[] | undefined) ?? []
      let value = 1
      for (const check of checks) {
        if (check.kind === 'min' && typeof check.value === 'number') {
          value = Math.max(value, Math.ceil(check.value))
        }
      }
      return value
    }
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
      return Array.from({ length: count }, (_, index) => sampleFor(item, key, `${label}${index + 1}`))
    }
    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, z.ZodTypeAny>)()
      const result: Record<string, unknown> = {}
      for (const [name, field] of Object.entries(shape)) {
        result[name] = sampleFor(field, name, `${label}-${name}`)
      }
      return result
    }
    case 'ZodUnion':
      return sampleFor((def.options as z.ZodTypeAny[])[0], key, label)
    case 'ZodRecord':
      return {}
    default:
      return label
  }
}

function mockResponse(schema: z.ZodTypeAny, label: string): string {
  const sample = sampleFor(schema, '', label)
  const parsed = schema.safeParse(sample)
  if (!parsed.success) {
    throw new Error(`The mocked ${label} response does not satisfy its schema`)
  }
  return JSON.stringify(sample, null, 2)
}

function isZodSchema(value: unknown): value is z.ZodTypeAny {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { safeParse?: unknown }).safeParse === 'function'
  )
}

function findSchema(pattern: RegExp, exclude?: RegExp): z.ZodTypeAny | undefined {
  for (const [name, value] of Object.entries(responseSchemas)) {
    if (pattern.test(name) && !(exclude?.test(name) ?? false) && isZodSchema(value)) {
      return value
    }
  }
  return undefined
}

const checklistSchema = findSchema(/^checklistResponseSchema$/)
const questionsSchema = findSchema(/^questionsResponseSchema$/)
const finalHtmlSchema = findSchema(/^finalHtmlResponseSchema$/)
const styleSchema = findSchema(/style|css/i, /^finalHtml/)

const FENCE = '`'.repeat(3)

/** Wraps JSON the way chatty AI tools do, to exercise the tolerant parser. */
function chatty(json: string): string {
  return `Here is the JSON you asked for:\n\n${FENCE}json\n${json}\n${FENCE}\n\nLet me know if you want changes.`
}

const NEXT_BUTTON = /continue|next|submit|save|generate|start/i
const SAVE_PASTE_BUTTON = /save|use (this|response)|accept|apply|continue|confirm/i

/** The text area the user pastes the AI response into (the prompt itself is read-only). */
function pasteArea(page: Page) {
  return page.locator('textarea:not([readonly]):not([disabled])').last()
}

async function copyPrompt(page: Page): Promise<void> {
  const copy = page.getByRole('button', { name: /copy/i }).first()
  await expect(copy).toBeVisible()
  await copy.click()
  await expect(page.getByText(/copied|copy/i).first()).toBeVisible()
}

async function pasteAndSave(page: Page, text: string): Promise<void> {
  await copyPrompt(page)

  // A bad paste is reported and cannot be saved.
  const area = pasteArea(page)
  await area.fill('this is definitely not JSON')
  await expect(page.getByRole('alert').or(page.getByText(/invalid|error|could not|unable/i)).first()).toBeVisible()

  // The valid response is accepted and saved.
  await area.fill(text)
  const save = page.getByRole('button', { name: SAVE_PASTE_BUTTON }).first()
  await expect(save).toBeEnabled()
  await save.click()
}

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test.describe('full flow with mocked AI responses', () => {
  test.beforeEach(async ({ page }) => {
    // Count print calls from any frame, including the frame used for printing.
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      const record = () => {
        try {
          const top = window.top as unknown as Record<string, unknown>
          top.__printCalls = ((top.__printCalls as number | undefined) ?? 0) + 1
        } catch {
          w.__printCalls = ((w.__printCalls as number | undefined) ?? 0) + 1
        }
      }
      window.print = record
    })
  })

  test('goes from job context to a printable A4 resume', async ({ page }) => {
    expect(checklistSchema, 'checklist schema should be exported').toBeDefined()
    expect(questionsSchema, 'questions schema should be exported').toBeDefined()
    expect(finalHtmlSchema, 'final HTML schema should be exported').toBeDefined()

    const checklistJson = mockResponse(checklistSchema as z.ZodTypeAny, 'checklist')
    const questionsJson = mockResponse(questionsSchema as z.ZodTypeAny, 'loop')
    const finalHtmlJson = mockResponse(finalHtmlSchema as z.ZodTypeAny, 'final')

    await page.goto('/')

    // Optional: mocked style response through the style generator.
    if (styleSchema !== undefined) {
      const stylesLink = page.getByRole('link', { name: /styles/i }).first()
      if ((await stylesLink.count()) > 0) {
        await test.step('style', async () => {
          await stylesLink.click()
          const create = page.getByRole('button', { name: /new|create|generate|add/i }).first()
          if ((await create.count()) > 0) {
            await create.click()
            await pasteAndSave(page, mockResponse(styleSchema, 'style'))
          }
          await page.goto('/')
        })
      }
    }

    await test.step('start a resume session', async () => {
      await page
        .getByRole('link', { name: /new (resume|session)|create|start|build/i })
        .or(page.getByRole('button', { name: /new (resume|session)|create|start|build/i }))
        .first()
        .click()
    })

    await test.step('job context', async () => {
      await page.locator('textarea').first().fill('Senior frontend engineer at Acme. React, TypeScript, testing.')
      await page.getByRole('button', { name: NEXT_BUTTON }).first().click()
    })

    await test.step('checklist', async () => {
      await pasteAndSave(page, chatty(checklistJson))
    })

    await test.step('question loop', async () => {
      await pasteAndSave(page, questionsJson)

      const form = page.locator('form').first()
      await expect(form).toBeVisible()
      const fields = form.getByRole('textbox')
      const count = await fields.count()
      expect(count).toBeGreaterThan(0)
      for (let index = 0; index < count; index += 1) {
        await fields.nth(index).fill(`E2E answer ${index + 1}`)
      }
      await form.getByRole('button', { name: /submit|send|save answers/i }).click()

      await page.getByRole('button', { name: /finish|skip|done/i }).first().click()
    })

    await test.step('final HTML', async () => {
      await pasteAndSave(page, finalHtmlJson)
    })

    await test.step('A4 preview and print', async () => {
      const toPreview = page
        .getByRole('link', { name: /preview|render|a4|view resume|print/i })
        .or(page.getByRole('button', { name: /preview|render|a4|view resume/i }))
        .first()
      if ((await toPreview.count()) > 0 && (await page.getByRole('button', { name: /print/i }).count()) === 0) {
        await toPreview.click()
      }

      await expect(
        page.locator('iframe, [class*="a4" i], [data-testid*="preview" i]').first(),
      ).toBeVisible()

      const print = page.getByRole('button', { name: /print/i }).first()
      await expect(print).toBeEnabled()
      await print.click()

      await expect
        .poll(async () =>
          page.evaluate(
            () => ((window as unknown as Record<string, unknown>).__printCalls as number | undefined) ?? 0,
          ),
        )
        .toBeGreaterThan(0)
    })
  })
})