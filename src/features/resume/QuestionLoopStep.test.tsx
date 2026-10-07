import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

import type { ChecklistResponse, QuestionsResponse } from '@/shared/prompting'
import { checklistResponseSchema, questionsResponseSchema } from '@/shared/prompting/response-schemas'

import QuestionLoopStep from './QuestionLoopStep'
import type { AnsweredQuestion } from './QuestionLoopStep'

/**
 * Samples are built from the schemas themselves, so these tests do not repeat
 * the field lists of the AI responses.
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

function sampleFor(schema: z.ZodTypeAny, label: string): unknown {
  const inner = unwrap(schema)
  const def = defOf(inner)

  switch (def.typeName) {
    case 'ZodString': {
      const checks = (def.checks as Check[] | undefined) ?? []
      let length = label.length
      for (const check of checks) {
        if ((check.kind === 'min' || check.kind === 'length') && typeof check.value === 'number') {
          length = Math.max(length, check.value)
        }
      }
      return label.padEnd(length, 'x')
    }
    case 'ZodNumber':
      return 1
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
      return Array.from({ length: count }, (_, index) => sampleFor(item, `${label}${index + 1}`))
    }
    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, z.ZodTypeAny>)()
      const result: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(shape)) {
        result[key] = sampleFor(field, `${label}-${key}`)
      }
      return result
    }
    case 'ZodUnion':
      return sampleFor((def.options as z.ZodTypeAny[])[0], label)
    case 'ZodRecord':
      return {}
    default:
      return label
  }
}

function makeChecklist(): ChecklistResponse {
  return sampleFor(checklistResponseSchema, 'checklist') as unknown as ChecklistResponse
}

function makePending(): QuestionsResponse {
  return sampleFor(questionsResponseSchema, 'pending') as unknown as QuestionsResponse
}

function questionsOf(response: QuestionsResponse): Array<Record<string, unknown>> {
  return (response as unknown as { questions: Array<Record<string, unknown>> }).questions
}

function makeAnswered(answerText: string): AnsweredQuestion[] {
  return questionsOf(makePending()).map(
    (question) => ({ question, answer: answerText }) as unknown as AnsweredQuestion,
  )
}

type StepProps = ComponentProps<typeof QuestionLoopStep>

/**
 * The props are listed in one place. Fields that a test does not care about
 * keep these defaults.
 */
function renderStep(overrides: Record<string, unknown> = {}) {
  const props = {
    jobContext: 'JOB-CONTEXT-MARKER: senior frontend engineer',
    checklist: makeChecklist(),
    pendingQuestions: null,
    answered: [],
    round: 1,
    onLoopResponse: vi.fn(),
    onSubmitAnswers: vi.fn(),
    onEditAnswer: vi.fn(),
    onFinishEarly: vi.fn(),
    ...overrides,
  }
  const user = userEvent.setup()
  const view = render(<QuestionLoopStep {...(props as unknown as StepProps)} />)
  return { user, props, ...view }
}

function answerFields(container: HTMLElement): HTMLElement[] {
  const form = container.querySelector('form')
  if (form === null) {
    return []
  }
  return within(form as HTMLElement).queryAllByRole('textbox')
}

describe('QuestionLoopStep', () => {
  describe('when no questions are pending', () => {
    it('shows the prompt step', () => {
      renderStep()

      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    it('does not show answer fields', () => {
      const { container } = renderStep()

      expect(answerFields(container)).toHaveLength(0)
    })
  })

  describe('when questions are pending', () => {
    it('shows one answer field per question', () => {
      const pending = makePending()
      const { container } = renderStep({ pendingQuestions: pending })

      expect(answerFields(container)).toHaveLength(questionsOf(pending).length)
    })

    it('shows a submit button for the answers', () => {
      renderStep({ pendingQuestions: makePending() })

      expect(screen.getByRole('button', { name: /submit|send|save answers/i })).toBeInTheDocument()
    })
  })

  describe('submitting', () => {
    it('is blocked until every question is answered', async () => {
      const { user, props } = renderStep({ pendingQuestions: makePending() })

      await user.click(screen.getByRole('button', { name: /submit|send|save answers/i }))

      expect(props.onSubmitAnswers).not.toHaveBeenCalled()
    })

    it('is blocked when an answer holds only whitespace', async () => {
      const { user, props, container } = renderStep({ pendingQuestions: makePending() })

      for (const field of answerFields(container)) {
        await user.type(field, '   ')
      }
      await user.click(screen.getByRole('button', { name: /submit|send|save answers/i }))

      expect(props.onSubmitAnswers).not.toHaveBeenCalled()
    })

    it('passes the answers on once every question is answered', async () => {
      const pending = makePending()
      const { user, props, container } = renderStep({ pendingQuestions: pending })

      for (const field of answerFields(container)) {
        await user.type(field, 'ANSWER-MARKER')
      }
      await user.click(screen.getByRole('button', { name: /submit|send|save answers/i }))

      expect(props.onSubmitAnswers).toHaveBeenCalledTimes(1)
      const submitted = props.onSubmitAnswers.mock.calls[0][0] as AnsweredQuestion[]
      expect(submitted).toHaveLength(questionsOf(pending).length)
      expect(JSON.stringify(submitted)).toContain('ANSWER-MARKER')
    })
  })

  describe('editing answers', () => {
    it('shows the answers that were already given', () => {
      renderStep({ answered: makeAnswered('GIVEN-ANSWER-MARKER') })

      expect(screen.getAllByText(/GIVEN-ANSWER-MARKER/).length).toBeGreaterThan(0)
    })

    it('reports an edited answer', async () => {
      const answered = makeAnswered('GIVEN-ANSWER-MARKER')
      const { user, props } = renderStep({ answered })

      await user.click(screen.getAllByRole('button', { name: /edit/i })[0])
      const field = screen.getAllByRole('textbox')[0]
      await user.clear(field)
      await user.type(field, 'EDITED-ANSWER-MARKER')
      await user.click(screen.getByRole('button', { name: /save|done|update/i }))

      expect(props.onEditAnswer).toHaveBeenCalled()
      const call = props.onEditAnswer.mock.calls[0] as unknown[]
      expect(call).toContain('EDITED-ANSWER-MARKER')
    })
  })

  describe('finishing early', () => {
    it('lets the user finish before every item is complete', async () => {
      const { user, props } = renderStep()

      await user.click(screen.getByRole('button', { name: /finish|skip|done/i }))

      expect(props.onFinishEarly).toHaveBeenCalledTimes(1)
    })
  })
})