import { useReducer } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import type { ChecklistResponse, QuestionsResponse } from '@/shared/prompting'
import { useStorageStore } from '@/shared/storage'
import { SessionStage } from '@/shared/types'
import StageStepper from '@/shared/ui/StageStepper'
import { useFocusOnChange } from '@/shared/ui/use-focus-on-change'

import ChecklistSetupStep from './ChecklistSetupStep'
import FinalHtmlStep from './FinalHtmlStep'
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
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const hydrated = useStorageStore((store) => store.hydrated)
  // True when the link points at a session that is not saved in this browser.
  const sessionMissing = useStorageStore(
    (store) =>
      sessionId !== null &&
      !store.sessions.some((session) => session.id === sessionId),
  )
  const {
    stage,
    jobContext,
    checklist,
    qaHistory,
    pendingQuestions,
    rounds,
    finishedEarly,
  } = state

  // Move focus to the page heading when the stage changes, so keyboard and
  // screen reader users start at the top of the new step.
  const headingRef = useFocusOnChange<HTMLHeadingElement>(stage, {
    preventScroll: true,
  })

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

  function handleFinalHtmlSave(html: string) {
    dispatch({ type: 'SAVE_FINAL_HTML', html })
  }

  if (!hydrated) {
    return (
      <section aria-busy="true">
        <h2 className="app-page-title">Resume</h2>
        <p className="app-page-lead" role="status" aria-live="polite">
          Loading your resume...
        </p>
      </section>
    )
  }

  if (sessionMissing) {
    return (
      <section>
        <h2 className="app-page-title">Resume not found</h2>
        <p className="app-page-lead" role="alert">
          This resume is not saved in this browser. It may have been deleted, or
          the link may have been made on another device.
        </p>
        <div className="app-actions">
          <Link to="/" className="app-button">
            Back to your resumes
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2
        ref={headingRef}
        className="app-page-title"
        tabIndex={-1}
      >
        Resume
      </h2>
      <p className="app-page-lead">
        Start a new resume application. The guided prompt workflow will be
        added here.
      </p>
      <StageStepper current={stage} />
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
        ) : stage === SessionStage.FinalHtml && checklist !== null ? (
          <>
            <p>
              {finishedEarly
                ? `The question loop ended early after ${rounds} of at most ${MAX_LOOP_ROUNDS} rounds with ${countCompleteItems(checklist)} checklist items complete.`
                : 'Every checklist item is complete.'}{' '}
              The resume is ready to be generated.
            </p>
            <FinalHtmlStep
              jobContext={jobContext}
              checklist={checklist}
              answers={qaHistory}
              onSave={handleFinalHtmlSave}
            />
          </>
        ) : stage === SessionStage.Complete ? (
          <p>The final resume HTML has been saved to this session.</p>
        ) : null}
      </div>
    </section>
  )
}