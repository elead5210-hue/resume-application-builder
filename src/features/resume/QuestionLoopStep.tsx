import { useId, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import {
  QUESTIONS_JSON_SCHEMA,
  STAGE_TEMPLATES,
  buildLoopContext,
  buildPrompt,
  questionsResponseSchema,
} from '@/shared/prompting'
import type { LoopQaEntry, QuestionsResponse } from '@/shared/prompting'
import { PromptStep } from '@/shared/ui/PromptStep'
import { isTranscriptionSupported, transcribeAudio } from '@/shared/ui/transcribe-audio'
import { useAudioRecorder } from '@/shared/ui/use-audio-recorder'
import { useFocusOnChange } from '@/shared/ui/use-focus-on-change'

import ChecklistProgressPanel from './ChecklistProgressPanel'

/** A question the AI asked together with the user's answer. */
export interface AnsweredQuestion {
  question: QuestionsResponse['questions'][number]
  answer: string
}

interface QuestionLoopStepProps {
  /** The job details saved to the session. */
  jobContext: string
  /** The latest checklist, with the status of every item. */
  checklist: QuestionsResponse['checklist']
  /** The recent questions and answers, oldest first. */
  recentQa: ReadonlyArray<AnsweredQuestion>
  /**
   * Called when the user saves a pasted loop response. The parent stores the
   * updated checklist and keeps the returned questions for answering.
   */
  onResponseSave: (response: QuestionsResponse) => void
  /** The questions from the last saved response that still need answers. */
  pendingQuestions: ReadonlyArray<QuestionsResponse['questions'][number]>
  /**
   * Called with the answered questions when the user submits. The parent adds
   * them to the session history and generates the next loop prompt.
   */
  onSubmitAnswers: (answers: AnsweredQuestion[]) => void
  /**
   * Called when the user edits the answer to a previous question. The parent
   * updates the session history so the next loop prompt uses the new answer.
   */
  onEditAnswer: (questionId: string, answer: string) => void
  /** Called when the user ends the loop before every item is complete. */
  onFinishEarly: () => void
}

/**
 * Question loop stage: shows the loop prompt in the shared PromptStep, and
 * once a response is saved, renders the returned questions with an answer
 * field under each.
 */
export default function QuestionLoopStep({
  jobContext,
  checklist,
  recentQa,
  onResponseSave,
  pendingQuestions,
  onSubmitAnswers,
  onEditAnswer,
  onFinishEarly,
}: QuestionLoopStepProps) {
  const formId = useId()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const recorder = useAudioRecorder()
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [transcribingId, setTranscribingId] = useState<string | null>(null)
  const [recordErrors, setRecordErrors] = useState<Record<string, string>>({})
  // Recording only helps when the browser can also turn it into text.
  const recordingAvailable = recorder.isSupported && isTranscriptionSupported()
  // When a new set of questions arrives, move focus to the first answer field
  // so keyboard and screen reader users can start answering straight away.
  const firstAnswerRef = useFocusOnChange<HTMLTextAreaElement>(
    pendingQuestions,
    { enabled: pendingQuestions.length > 0 },
  )

  const prompt = useMemo(() => {
    const qa: LoopQaEntry[] = recentQa.map((entry) => ({
      question: { text: entry.question.text },
      answer: entry.answer,
    }))
    return buildPrompt({
      instruction: STAGE_TEMPLATES.questionLoop.instruction,
      context: buildLoopContext({ jobContext, checklist, recentQa: qa }),
      schema: QUESTIONS_JSON_SCHEMA,
    })
  }, [jobContext, checklist, recentQa])

  const allAnswered =
    pendingQuestions.length > 0 &&
    pendingQuestions.every((q) => (drafts[q.id] ?? '').trim() !== '')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!allAnswered) {
      return
    }
    onSubmitAnswers(
      pendingQuestions.map((question) => ({
        question,
        answer: (drafts[question.id] ?? '').trim(),
      })),
    )
    setDrafts({})
  }

  async function handleTranscriptUpload(
    questionId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) {
      return
    }
    const isTextFile =
      file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain'
    if (!isTextFile) {
      setUploadErrors((current) => ({
        ...current,
        [questionId]: 'Please choose a .txt transcript file.',
      }))
      input.value = ''
      return
    }
    try {
      const text = await file.text()
      setDrafts((current) => ({ ...current, [questionId]: text }))
      setUploadErrors((current) => {
        const next = { ...current }
        delete next[questionId]
        return next
      })
    } catch {
      setUploadErrors((current) => ({
        ...current,
        [questionId]: 'The file could not be read. Try again or paste the text.',
      }))
    }
    input.value = ''
  }

  function setRecordError(questionId: string, message: string | null) {
    setRecordErrors((current) => {
      const next = { ...current }
      if (message === null) {
        delete next[questionId]
      } else {
        next[questionId] = message
      }
      return next
    })
  }

  async function handleRecordToggle(questionId: string) {
    if (recordingId === questionId && recorder.isRecording) {
      const recording = await recorder.stop()
      setRecordingId(null)
      if (recording === null) {
        setRecordError(
          questionId,
          'No audio was captured. Try again, upload a transcript, or type your answer.',
        )
        return
      }
      setTranscribingId(questionId)
      const result = await transcribeAudio(recording.blob)
      setTranscribingId(null)
      if (result.status === 'ok') {
        setRecordError(questionId, null)
        setDrafts((current) => {
          const existing = current[questionId] ?? ''
          return {
            ...current,
            [questionId]:
              existing.trim() === ''
                ? result.text
                : `${existing.trimEnd()} ${result.text}`,
          }
        })
      } else {
        setRecordError(questionId, result.reason)
      }
      return
    }
    if (recorder.isRecording || transcribingId !== null) {
      return
    }
    setRecordError(questionId, null)
    setRecordingId(questionId)
    await recorder.start()
  }

  function startEditing(entry: AnsweredQuestion) {
    setEditingId(entry.question.id)
    setEditDraft(entry.answer)
  }

  function saveEdit() {
    if (editingId === null || editDraft.trim() === '') {
      return
    }
    onEditAnswer(editingId, editDraft.trim())
    setEditingId(null)
    setEditDraft('')
  }

  return (
    <div className="question-loop-step">
      <ChecklistProgressPanel checklist={checklist} />
      {recentQa.length > 0 ? (
        <section
          className="question-loop-step__history"
          aria-label="Previous answers"
        >
          <h3 className="question-loop-step__title">Previous answers</h3>
          <ul className="question-loop-step__history-list">
            {recentQa.map((entry) => (
              <li
                key={entry.question.id}
                className="question-loop-step__history-item"
              >
                <p className="question-loop-step__question">
                  {entry.question.text}
                </p>
                {editingId === entry.question.id ? (
                  <>
                    <textarea
                      className="app-textarea question-loop-step__answer"
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      rows={4}
                      aria-label={`Edit answer: ${entry.question.text}`}
                    />
                    <div className="app-actions">
                      <button
                        type="button"
                        className="app-button"
                        onClick={saveEdit}
                        disabled={editDraft.trim() === ''}
                      >
                        Save answer
                      </button>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="question-loop-step__history-answer">
                      {entry.answer}
                    </p>
                    <button
                      type="button"
                      className="app-button app-button--secondary question-loop-step__edit"
                      onClick={() => startEditing(entry)}
                    >
                      Edit answer
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {pendingQuestions.length === 0 ? (
        <PromptStep
          key={prompt}
          title="Question loop"
          prompt={prompt}
          schema={questionsResponseSchema}
          onSave={onResponseSave}
          saveLabel="Save response"
          helperText={
            <p>
              {recentQa.length === 0
                ? 'Copy the prompt below into your AI assistant. It will reply with one or two questions and an updated checklist. Paste that reply back into the box underneath, check the preview, and save it. You will then be asked to answer the questions.'
                : 'Copy the new prompt below into the same AI assistant. It includes your latest answers and checklist. Paste the reply back into the box underneath, check the preview, and save it to get the next questions.'}
            </p>
          }
        />
      ) : (
        <form
          className="question-loop-step__form"
          onSubmit={handleSubmit}
          aria-labelledby={`${formId}-title`}
        >
          <h3 id={`${formId}-title`} className="question-loop-step__title">
            Answer the questions
          </h3>
          <p id={`${formId}-hint`} className="question-loop-step__hint">
            Answer every question below, then generate the next prompt. Your
            answers are saved with this resume.
          </p>
          <p className="question-loop-step__transcript-help">
            Prefer to speak your answer? Record it, upload the audio file to a
            transcription service such as TurboScribe, then use the upload
            button under a question to add the .txt transcript it produces. You
            can also type or paste your answer directly.
          </p>
          <ol className="question-loop-step__list">
            {pendingQuestions.map((question, index) => {
              const fieldId = `${formId}-${question.id}`
              const isRecordingThis =
                recordingId === question.id && recorder.isRecording
              const isTranscribingThis = transcribingId === question.id
              const recordDisabled =
                isTranscribingThis ||
                (!isRecordingThis &&
                  (recorder.isRecording || transcribingId !== null))
              const recordError =
                recordErrors[question.id] ??
                (recordingId === question.id && !recorder.isRecording
                  ? recorder.error
                  : null)
              return (
                <li key={question.id} className="question-loop-step__item">
                  <label
                    className="question-loop-step__question"
                    htmlFor={fieldId}
                  >
                    <span className="app-visually-hidden">
                      Question {index + 1} of {pendingQuestions.length}:{' '}
                    </span>
                    {question.text}
                  </label>
                  <textarea
                    id={fieldId}
                    ref={index === 0 ? firstAnswerRef : undefined}
                    aria-describedby={`${formId}-hint`}
                    className="app-textarea question-loop-step__answer"
                    value={drafts[question.id] ?? ''}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    rows={4}
                  />
                  <div className="question-loop-step__record">
                    {recordingAvailable ? (
                      <>
                        <button
                          type="button"
                          className="app-button app-button--secondary question-loop-step__record-button"
                          onClick={() => void handleRecordToggle(question.id)}
                          disabled={recordDisabled}
                          aria-pressed={isRecordingThis}
                        >
                          {isRecordingThis ? 'Stop recording' : 'Record answer'}
                          <span className="app-visually-hidden">
                            {' '}
                            for question {index + 1}
                          </span>
                        </button>
                        {isRecordingThis ? (
                          <p
                            className="question-loop-step__record-status"
                            role="status"
                          >
                            Recording... press stop when you are done.
                          </p>
                        ) : null}
                        {isTranscribingThis ? (
                          <p
                            className="question-loop-step__record-status"
                            role="status"
                          >
                            Transcribing your recording...
                          </p>
                        ) : null}
                        {recordError ? (
                          <p
                            className="question-loop-step__record-error"
                            role="alert"
                          >
                            {recordError}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="question-loop-step__record-note">
                        Recording and automatic transcription are not available in
                        this browser. Upload a transcript file or type your answer
                        instead.
                      </p>
                    )}
                  </div>
                  <div className="question-loop-step__transcript">
                    <label
                      className="app-button app-button--secondary question-loop-step__transcript-label"
                      htmlFor={`${fieldId}-transcript`}
                    >
                      Upload transcript (.txt)
                      <span className="app-visually-hidden">
                        {' '}
                        for question {index + 1}
                      </span>
                    </label>
                    <input
                      id={`${fieldId}-transcript`}
                      type="file"
                      accept=".txt,text/plain"
                      className="app-visually-hidden"
                      onChange={(event) =>
                        void handleTranscriptUpload(question.id, event)
                      }
                    />
                    {uploadErrors[question.id] ? (
                      <p
                        className="question-loop-step__transcript-error"
                        role="alert"
                      >
                        {uploadErrors[question.id]}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="app-actions">
            <button
              type="submit"
              className="app-button"
              disabled={!allAnswered}
            >
              Generate next prompt
            </button>
          </div>
        </form>
      )}
      <div className="app-actions question-loop-step__finish">
        <button
          type="button"
          className="app-button app-button--secondary"
          onClick={onFinishEarly}
        >
          Finish early
        </button>
      </div>
    </div>
  )
}