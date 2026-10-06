import { useReducer } from 'react'

import type { ChecklistResponse, QuestionsResponse } from '@/shared/prompting'
import { SessionStage } from '@/shared/types'

import ChecklistSetupStep from './ChecklistSetupStep'
import JobContextStep from './JobContextStep'
import QuestionLoopStep from './QuestionLoopStep'
import type { AnsweredQuestion } from './QuestionLoopStep'
import {
  INITIAL_LOOP_STATE,
  MAX_LOOP_ROUNDS,
  countCompleteItems,
  loopReducer,
} from './loop-state'

export default function ResumePage() {
  const [state, dispatch] = useReducer(loopReducer, INITIAL_LOOP_STATE)
  const {
    stage,
    jobContext,
    checklist,
    qaHistory,
    pendingQuestions,
    rounds,
    finishedEarly,
  } = state

  function handleJobContextSubmit(text: string) {
    dispatch({ type: 'SUBMIT_JOB_CONTEXT', jobContext: text })
  }

  function handleChecklistSave(saved: ChecklistResponse) {
    dispatch({ type: 'SAVE_CHECKLIST', checklist: saved })
  }

  function handleLoopResponseSave(response: QuestionsResponse) {
    dispatch({ type: 'SAVE_LOOP_RESPONSE', response })
  }

  function handleSubmitAnswers(answers: AnsweredQuestion[]) {
    dispatch({ type: 'SUBMIT_ANSWERS', answers })
  }

  function handleEditAnswer(questionId: string, answer: string) {
    dispatch({ type: 'EDIT_ANSWER', questionId, answer })
  }

  function handleFinishEarly() {
    dispatch({ type: 'FINISH_EARLY' })
  }

  return (
    <section>
      <h2 className="app-page-title">Resume</h2>
      <p className="app-page-lead">
        Start a new resume application. The guided prompt workflow will be
        added here.
      </p>
      <div className="app-card">
        {stage === SessionStage.JobContext ? (
          <JobContextStep
            initialValue={jobContext}
            onSubmit={handleJobContextSubmit}
          />
        ) : stage === SessionStage.ChecklistSetup ? (
          <ChecklistSetupStep
            jobContext={jobContext}
            onSave={handleChecklistSave}
          />
        ) : stage === SessionStage.QuestionLoop && checklist !== null ? (
          <QuestionLoopStep
            jobContext={jobContext}
            checklist={checklist}
            recentQa={qaHistory}
            pendingQuestions={pendingQuestions}
            onResponseSave={handleLoopResponseSave}
            onSubmitAnswers={handleSubmitAnswers}
            onEditAnswer={handleEditAnswer}
            onFinishEarly={handleFinishEarly}
          />
        ) : stage === SessionStage.FinalHtml ? (
          <p>
            {finishedEarly
              ? `The question loop ended early after ${rounds} of at most ${MAX_LOOP_ROUNDS} rounds with ${countCompleteItems(checklist)} checklist items complete.`
              : 'Every checklist item is complete.'}{' '}
            The resume is ready to be generated.
          </p>
        ) : null}
      </div>
    </section>
  )
}