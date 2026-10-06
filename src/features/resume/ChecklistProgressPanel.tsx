import type { ChecklistResponse } from '@/shared/prompting'

import { countCompleteItems } from './loop-state'

interface ChecklistProgressPanelProps {
  /** The latest checklist, with the status of every item. */
  checklist: ChecklistResponse
}

/** Human-readable label for each checklist item status. */
const STATUS_LABELS: Record<
  ChecklistResponse['items'][number]['status'],
  string
> = {
  pending: 'Pending',
  in_progress: 'In progress',
  complete: 'Complete',
}

/**
 * Checklist progress panel: lists each checklist item with its status and
 * shows how many items are complete.
 */
export default function ChecklistProgressPanel({
  checklist,
}: ChecklistProgressPanelProps) {
  const total = checklist.items.length
  const complete = countCompleteItems(checklist)

  return (
    <aside className="checklist-progress" aria-label="Checklist progress">
      <h3 className="checklist-progress__title">Checklist progress</h3>
      <p className="checklist-progress__summary">
        {complete} of {total} items complete
      </p>
      <progress
        className="app-progress checklist-progress__bar"
        value={complete}
        max={total === 0 ? 1 : total}
        aria-label="Checklist items complete"
      />
      <ul className="checklist-progress__list">
        {checklist.items.map((item) => (
          <li
            key={item.id}
            className={`checklist-progress__item checklist-progress__item--${item.status}`}
          >
            <span className="checklist-progress__label">{item.label}</span>
            <span
              className={`app-badge checklist-progress__status checklist-progress__status--${item.status}`}
            >
              {STATUS_LABELS[item.status]}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}