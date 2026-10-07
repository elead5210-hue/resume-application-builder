import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import type { ChecklistResponse, QuestionsResponse } from '@/shared/prompting'
import {
  checklistItemStatusSchema,
  checklistResponseSchema,
  questionsResponseSchema,
} from '@/shared/prompting/response-schemas'

import {
  INITIAL_LOOP_STATE,
  MAX_LOOP_ROUNDS,
  countCompleteItems,
  isChecklistComplete,
  loopReducer,
} from './loop-state'
import type { LoopAction, LoopState } from './loop-state'
import type { AnsweredQuestion } from './QuestionLoopStep'

/**
 * Samples are built from the schemas themselves, so these tests exercise the
 * reducer without repeating the field lists of the AI responses.
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

function sampleString(def: Def, label: string): string {
  const checks = (def.checks as Check[] | undefined) ?? []
  let length = label.length
  for (const check of checks) {
    if ((check.kind === 'min' || check.kind === 'length') && typeof check.value === 'number') {
      length = Math.max(length, check.value)
    }
  }
  return label.padEnd(length, 'x')
}

function sampleFor(schema: z.ZodTypeAny, label = 'sample'): unknown {
  const inner = unwrap(schema)
  const def = defOf(inner)

  switch (def.typeName) {
    case 'ZodString':
      return sampleString(def, label)
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
      return Array.from({ length: count }, () => sampleFor(item, label))
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

const STATUS_OPTIONS = (checklistItemStatusSchema as unknown as { options: string[] }).options

function makeChecklist(status?: string): ChecklistResponse {
  const checklist = sampleFor(checklistResponseSchema, 'checklist') as Record<string, unknown>
  if (status !== undefined) {
    const items = checklist.items as Array<Record<string, unknown>>
    for (const item of items) {
      item.status = status
    }
  }
  return checklist as unknown as ChecklistResponse
}

function makeQuestionsResponse(): QuestionsResponse {
  return sampleFor(questionsResponseSchema, 'loop') as unknown as QuestionsResponse
}

function makeAnswers(answerText: string): AnsweredQuestion[] {
  const response = makeQuestionsResponse() as unknown as Record<string, unknown>
  const questions = response.questions as Array<Record<string, unknown>>
  return questions.map(
    (question) => ({ question, answer: answerText }) as unknown as AnsweredQuestion,
  )
}

function firstQuestionId(answers: AnsweredQuestion[]): string {
  const question = (answers[0] as unknown as { question: Record<string, unknown> }).question
  return String(question.id)
}

function apply(state: LoopState, ...actions: LoopAction[]): LoopState {
  return actions.reduce((current, action) => loopReducer(current, action), state)
}

function checklistOf(state: LoopState): ChecklistResponse | null {
  return (state as unknown as { checklist: ChecklistResponse | null }).checklist
}

function serialize(value: unknown): string {
  return JSON.stringify(value)
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child)
    }
  }
  return value
}

const JOB_CONTEXT = 'JOB-CONTEXT-MARKER: senior frontend engineer'

function toLoopStage(): LoopState {
  return apply(
    INITIAL_LOOP_STATE,
    { type: 'SUBMIT_JOB_CONTEXT', jobContext: JOB_CONTEXT },
    { type: 'SAVE_CHECKLIST', checklist: makeChecklist(STATUS_OPTIONS[0]) },
  )
}

describe('loopReducer', () => {
  describe('purity', () => {
    it('gives the same result for the same state and action', () => {
      const action: LoopAction = { type: 'SUBMIT_JOB_CONTEXT', jobContext: JOB_CONTEXT }

      expect(loopReducer(INITIAL_LOOP_STATE, action)).toEqual(
        loopReducer(INITIAL_LOOP_STATE, action),
      )
    })

    it('does not modify the state it is given', () => {
      const frozen = deepFreeze(structuredClone(INITIAL_LOOP_STATE))

      expect(() =>
        loopReducer(frozen, { type: 'SUBMIT_JOB_CONTEXT', jobContext: JOB_CONTEXT }),
      ).not.toThrow()
      expect(frozen).toEqual(INITIAL_LOOP_STATE)
    })

    it('does not throw on any action from the initial state', () => {
      const actions: LoopAction[] = [
        { type: 'SUBMIT_JOB_CONTEXT', jobContext: JOB_CONTEXT },
        { type: 'SAVE_CHECKLIST', checklist: makeChecklist() },
        { type: 'SAVE_LOOP_RESPONSE', response: makeQuestionsResponse() },
        { type: 'SUBMIT_ANSWERS', answers: makeAnswers('answer') },
        { type: 'EDIT_ANSWER', questionId: 'missing', answer: 'answer' },
        { type: 'FINISH_EARLY' },
        { type: 'SAVE_FINAL_HTML', html: '<div>resume</div>' },
      ]

      for (const action of actions) {
        expect(() => loopReducer(INITIAL_LOOP_STATE, action)).not.toThrow()
      }
    })
  })

  describe('stage transitions', () => {
    it('moves on from the initial stage when the job context is submitted', () => {
      const next = apply(INITIAL_LOOP_STATE, {
        type: 'SUBMIT_JOB_CONTEXT',
        jobContext: JOB_CONTEXT,
      })

      expect(next.stage).not.toBe(INITIAL_LOOP_STATE.stage)
      expect(serialize(next)).toContain(JOB_CONTEXT)
    })

    it('moves on again when the checklist is saved', () => {
      const afterContext = apply(INITIAL_LOOP_STATE, {
        type: 'SUBMIT_JOB_CONTEXT',
        jobContext: JOB_CONTEXT,
      })
      const afterChecklist = apply(afterContext, {
        type: 'SAVE_CHECKLIST',
        checklist: makeChecklist(STATUS_OPTIONS[0]),
      })

      expect(afterChecklist.stage).not.toBe(afterContext.stage)
      expect(afterChecklist.stage).not.toBe(INITIAL_LOOP_STATE.stage)
    })

    it('keeps the job context once the checklist is saved', () => {
      expect(serialize(toLoopStage())).toContain(JOB_CONTEXT)
    })

    it('keeps the saved checklist', () => {
      const checklist = makeChecklist(STATUS_OPTIONS[0])
      const state = toLoopStage()

      expect(checklistOf(state)).toEqual(checklist)
    })

    it('moves to a different stage when the final HTML is saved', () => {
      const loopStage = toLoopStage()
      const done = apply(loopStage, { type: 'SAVE_FINAL_HTML', html: '<div>FINAL-MARKER</div>' })

      expect(done.stage).not.toBe(loopStage.stage)
      expect(serialize(done)).toContain('FINAL-MARKER')
    })
  })

  describe('checklist updates', () => {
    it('does not change the checklist when answers are submitted', () => {
      const loopStage = toLoopStage()
      const withQuestions = apply(loopStage, {
        type: 'SAVE_LOOP_RESPONSE',
        response: makeQuestionsResponse(),
      })
      const before = checklistOf(withQuestions)

      const after = apply(withQuestions, {
        type: 'SUBMIT_ANSWERS',
        answers: makeAnswers('my answer'),
      })

      expect(checklistOf(after)).toEqual(before)
    })

    it('does not change the checklist when an answer is edited', () => {
      const answers = makeAnswers('first answer')
      const withAnswers = apply(
        toLoopStage(),
        { type: 'SAVE_LOOP_RESPONSE', response: makeQuestionsResponse() },
        { type: 'SUBMIT_ANSWERS', answers },
      )
      const before = checklistOf(withAnswers)

      const after = apply(withAnswers, {
        type: 'EDIT_ANSWER',
        questionId: firstQuestionId(answers),
        answer: 'edited answer',
      })

      expect(checklistOf(after)).toEqual(before)
    })

    it('does not change the checklist when the user finishes early', () => {
      const loopStage = toLoopStage()

      const after = apply(loopStage, { type: 'FINISH_EARLY' })

      expect(checklistOf(after)).toEqual(checklistOf(loopStage))
    })

    it('does not change the checklist when the final HTML is saved', () => {
      const loopStage = toLoopStage()

      const after = apply(loopStage, { type: 'SAVE_FINAL_HTML', html: '<div>x</div>' })

      expect(checklistOf(after)).toEqual(checklistOf(loopStage))
    })
  })

  describe('answer editing', () => {
    it('keeps submitted answers', () => {
      const state = apply(
        toLoopStage(),
        { type: 'SAVE_LOOP_RESPONSE', response: makeQuestionsResponse() },
        { type: 'SUBMIT_ANSWERS', answers: makeAnswers('ANSWER-MARKER') },
      )

      expect(serialize(state)).toContain('ANSWER-MARKER')
    })

    it('replaces an answer when it is edited', () => {
      const answers = makeAnswers('FIRST-ANSWER-MARKER')
      const submitted = apply(
        toLoopStage(),
        { type: 'SAVE_LOOP_RESPONSE', response: makeQuestionsResponse() },
        { type: 'SUBMIT_ANSWERS', answers },
      )

      const edited = apply(submitted, {
        type: 'EDIT_ANSWER',
        questionId: firstQuestionId(answers),
        answer: 'EDITED-ANSWER-MARKER',
      })

      expect(serialize(edited)).toContain('EDITED-ANSWER-MARKER')
      expect(serialize(edited)).not.toContain('FIRST-ANSWER-MARKER')
    })

    it('ignores an edit for a question that does not exist', () => {
      const submitted = apply(
        toLoopStage(),
        { type: 'SAVE_LOOP_RESPONSE', response: makeQuestionsResponse() },
        { type: 'SUBMIT_ANSWERS', answers: makeAnswers('FIRST-ANSWER-MARKER') },
      )

      const after = apply(submitted, {
        type: 'EDIT_ANSWER',
        questionId: 'no-such-question-id',
        answer: 'STRAY-ANSWER-MARKER',
      })

      expect(serialize(after)).not.toContain('STRAY-ANSWER-MARKER')
      expect(serialize(after)).toContain('FIRST-ANSWER-MARKER')
    })
  })

  describe('round cap and finishing', () => {
    it('has a positive whole number as the round cap', () => {
      expect(Number.isInteger(MAX_LOOP_ROUNDS)).toBe(true)
      expect(MAX_LOOP_ROUNDS).toBeGreaterThan(0)
    })

    it('leaves the question loop once the round cap is passed', () => {
      const loopStage = toLoopStage().stage
      let state = toLoopStage()
      let rounds = 0

      while (state.stage === loopStage && rounds < MAX_LOOP_ROUNDS + 5) {
        state = apply(
          state,
          { type: 'SAVE_LOOP_RESPONSE', response: makeQuestionsResponse() },
          { type: 'SUBMIT_ANSWERS', answers: makeAnswers(`answer ${rounds}`) },
        )
        rounds += 1
      }

      expect(state.stage).not.toBe(loopStage)
      expect(rounds).toBeLessThanOrEqual(MAX_LOOP_ROUNDS + 1)
    })

    it('leaves the question loop when the user finishes early', () => {
      const loopState = toLoopStage()

      const finished = apply(loopState, { type: 'FINISH_EARLY' })

      expect(finished.stage).not.toBe(loopState.stage)
    })

    it('leaves the question loop in the same way after a round of answers', () => {
      const loopState = toLoopStage()
      const early = apply(loopState, { type: 'FINISH_EARLY' })
      const afterRound = apply(
        loopState,
        { type: 'SAVE_LOOP_RESPONSE', response: makeQuestionsResponse() },
        { type: 'SUBMIT_ANSWERS', answers: makeAnswers('answer') },
        { type: 'FINISH_EARLY' },
      )

      expect(afterRound.stage).toBe(early.stage)
    })
  })
})

describe('isChecklistComplete', () => {
  it('is false when there is no checklist', () => {
    expect(isChecklistComplete(null)).toBe(false)
  })

  it('is false for a checklist without items', () => {
    const empty = { ...makeChecklist(), items: [] } as unknown as ChecklistResponse

    expect(isChecklistComplete(empty)).toBe(false)
  })

  it('is true for exactly one status and false for the others', () => {
    const completeStatuses = STATUS_OPTIONS.filter((status) =>
      isChecklistComplete(makeChecklist(status)),
    )

    expect(completeStatuses).toHaveLength(1)
  })

  it('is false when only some items are complete', () => {
    const completeStatus = STATUS_OPTIONS.find((status) =>
      isChecklistComplete(makeChecklist(status)),
    ) as string
    const otherStatus = STATUS_OPTIONS.find((status) => status !== completeStatus) as string
    const checklist = makeChecklist(completeStatus)
    const items = [
      ...(checklist as unknown as { items: Array<Record<string, unknown>> }).items,
    ].map((item) => ({ ...item }))
    items.push({ ...items[0], status: otherStatus })

    expect(isChecklistComplete({ ...checklist, items } as unknown as ChecklistResponse)).toBe(
      false,
    )
  })
})

describe('countCompleteItems', () => {
  it('is zero when there is no checklist', () => {
    expect(countCompleteItems(null)).toBe(0)
  })

  it('counts every item when all are complete', () => {
    const completeStatus = STATUS_OPTIONS.find((status) =>
      isChecklistComplete(makeChecklist(status)),
    ) as string
    const checklist = makeChecklist(completeStatus)

    expect(countCompleteItems(checklist)).toBe(checklist.items.length)
  })

  it('counts nothing when no item is complete', () => {
    const completeStatus = STATUS_OPTIONS.find((status) =>
      isChecklistComplete(makeChecklist(status)),
    ) as string
    const otherStatus = STATUS_OPTIONS.find((status) => status !== completeStatus) as string

    expect(countCompleteItems(makeChecklist(otherStatus))).toBe(0)
  })
})