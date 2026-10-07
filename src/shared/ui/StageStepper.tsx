import { SESSION_STAGES } from '@/shared/types'
import type { SessionStage } from '@/shared/types'

interface StageStepperProps {
  /** The stage the session is currently in. */
  current: SessionStage
  /** Optional display labels. A stage without one gets a label made from its name. */
  labels?: Partial<Record<SessionStage, string>>
  /** Accessible name for the navigation landmark. */
  ariaLabel?: string
}

/** Where a step sits relative to the current stage. */
type StepState = 'complete' | 'current' | 'upcoming'

/** Short text read out by screen readers for each step state. */
const STATE_TEXT: Record<StepState, string> = {
  complete: 'completed',
  current: 'current step',
  upcoming: 'not started',
}

/** Turns a stage name such as "checklistSetup" into "Checklist setup". */
function humanizeStage(stage: string): string {
  const spaced = stage
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Works out whether a step is done, active or still ahead. */
function getStepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) {
    return 'complete'
  }
  if (index === currentIndex) {
    return 'current'
  }
  return 'upcoming'
}

/**
 * Stage stepper: an ordered list of every session stage that shows which are
 * done, which one is active and which are still to come. The active step is
 * marked with aria-current="step", and each step also carries hidden text, so
 * the state does not depend on colour alone.
 */
function StageStepper({
  current,
  labels = {},
  ariaLabel = 'Resume progress',
}: StageStepperProps) {
  const currentIndex = SESSION_STAGES.indexOf(current)

  return (
    <nav className="stage-stepper" aria-label={ariaLabel}>
      <ol className="stage-stepper__list">
        {SESSION_STAGES.map((stage, index) => {
          const state = getStepState(index, currentIndex)
          const label = labels[stage] ?? humanizeStage(stage)

          return (
            <li
              key={stage}
              className={`stage-stepper__step stage-stepper__step--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="stage-stepper__marker" aria-hidden="true">
                {state === 'complete' ? '\u2713' : index + 1}
              </span>
              <span className="stage-stepper__label">{label}</span>
              <span className="app-visually-hidden">
                {' '}
                ({STATE_TEXT[state]})
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default StageStepper