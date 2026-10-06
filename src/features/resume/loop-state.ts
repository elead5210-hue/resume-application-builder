import type { ChecklistResponse, QuestionsResponse } from '@/shared/prompting'
import { SessionStage } from '@/shared/types'

import type { AnsweredQuestion } from './QuestionLoopStep'

/** Safety cap on the number of loop responses accepted in one session. */
export const MAX_LOOP_ROUNDS = 20

/** The state driven by the session reducer. */
export interface LoopState {
  stage: SessionStage
  jobContext: string
  checklist: ChecklistResponse | null
  qaHistory: AnsweredQuestion[]
  pendingQuestions: QuestionsResponse['questions']
  /** Number of loop responses saved so far. */
  rounds: number
  /** True when the loop was ended by the user or by the safety cap. */
  finishedEarly: boolean
  /** The final resume HTML saved from the final stage, or null until saved. */
  html: string | null
}

/** Every action the session reducer understands. */
export type LoopAction =
  | { type: 'SUBMIT_JOB_CONTEXT'; jobContext: string }
  | { type: 'SAVE_CHECKLIST'; checklist: ChecklistResponse }
  | { type: 'SAVE_LOOP_RESPONSE'; response: QuestionsResponse }
  | { type: 'SUBMIT_ANSWERS'; answers: AnsweredQuestion[] }
  | { type: 'EDIT_ANSWER'; questionId: string; answer: string }
  | { type: 'FINISH_EARLY' }
  | { type: 'SAVE_FINAL_HTML'; html: string }

/** The state a new session starts in. */
export const INITIAL_LOOP_STATE: LoopState = {
  stage: SessionStage.JobContext,
  jobContext: '',
  checklist: null,
  qaHistory: [],
  pendingQuestions: [],
  rounds: 0,
  finishedEarly: false,
  html: null,
}

/** True when the checklist has items and every one of them is complete. */
export function isChecklistComplete(
  checklist: ChecklistResponse | null,
): boolean {
  return (
    checklist !== null &&
    checklist.items.length > 0 &&
    checklist.items.every((item) => item.status === 'complete')
  )
}

/** Number of checklist items that are complete. */
export function countCompleteItems(
  checklist: ChecklistResponse | null,
): number {
  return checklist === null
    ? 0
    : checklist.items.filter((item) => item.status === 'complete').length
}

/**
 * Pure reducer for the session. Checklist statuses change only when an AI
 * response is saved, and the loop ends when every item is complete, when the
 * user finishes early, or when the round cap is reached.
 */
export function loopReducer(state: LoopState, action: LoopAction): LoopState {
  switch (action.type) {
    case 'SUBMIT_JOB_CONTEXT':
      if (state.stage !== SessionStage.JobContext) {
        return state
      }
      return {
        ...state,
        jobContext: action.jobContext,
        stage: SessionStage.ChecklistSetup,
      }

    case 'SAVE_CHECKLIST':
      if (state.stage !== SessionStage.ChecklistSetup) {
        return state
      }
      return {
        ...state,
        checklist: action.checklist,
        stage: SessionStage.QuestionLoop,
      }

    case 'SAVE_LOOP_RESPONSE': {
      if (state.stage !== SessionStage.QuestionLoop) {
        return state
      }
      const rounds = state.rounds + 1
      const checklist = action.response.checklist
      if (isChecklistComplete(checklist)) {
        return {
          ...state,
          checklist,
          rounds,
          pendingQuestions: [],
          stage: SessionStage.FinalHtml,
        }
      }
      if (rounds >= MAX_LOOP_ROUNDS) {
        return {
          ...state,
          checklist,
          rounds,
          pendingQuestions: [],
          finishedEarly: true,
          stage: SessionStage.FinalHtml,
        }
      }
      return {
        ...state,
        checklist,
        rounds,
        pendingQuestions: action.response.questions,
      }
    }

    case 'SUBMIT_ANSWERS':
      if (state.stage !== SessionStage.QuestionLoop) {
        return state
      }
      return {
        ...state,
        qaHistory: [...state.qaHistory, ...action.answers],
        pendingQuestions: [],
      }

    case 'EDIT_ANSWER':
      return {
        ...state,
        qaHistory: state.qaHistory.map((entry) =>
          entry.question.id === action.questionId
            ? { ...entry, answer: action.answer }
            : entry,
        ),
      }

    case 'FINISH_EARLY':
      if (state.stage !== SessionStage.QuestionLoop) {
        return state
      }
      return {
        ...state,
        pendingQuestions: [],
        finishedEarly: true,
        stage: SessionStage.FinalHtml,
      }

    case 'SAVE_FINAL_HTML':
      if (state.stage !== SessionStage.FinalHtml) {
        return state
      }
      return {
        ...state,
        html: action.html,
        stage: SessionStage.Complete,
      }

    default:
      return state
  }
}