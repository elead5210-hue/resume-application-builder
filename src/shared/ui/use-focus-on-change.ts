import { useEffect, useRef } from 'react'

/**
 * Moves keyboard focus to an element when a value changes.
 *
 * Use it when part of the screen is replaced and keyboard and screen reader
 * users would otherwise be left on a control that is gone, for example when
 * the session moves to a new stage or the route changes. Attach the returned
 * ref to the element that should receive focus, such as the stage heading or
 * the main content area.
 *
 * A heading or other element that is not normally focusable is given
 * tabindex="-1" so it can take focus from code without joining the tab order.
 */

/** Options for the focus hook. */
export interface UseFocusOnChangeOptions {
  /**
   * When true (the default), nothing is focused on the first render, so a page
   * does not steal focus when it first loads. Only later changes move focus.
   */
  skipInitial?: boolean
  /** When true, the browser does not scroll the element into view. */
  preventScroll?: boolean
  /** When false, focus is never moved. Defaults to true. */
  enabled?: boolean
}

/** Marks a value that has not been seen yet. */
const NOT_SEEN = Symbol('not-seen')

/**
 * Returns a ref to attach to an element. Whenever `value` changes, that
 * element receives focus.
 */
export function useFocusOnChange<T extends HTMLElement = HTMLElement>(
  value: unknown,
  options: UseFocusOnChangeOptions = {},
) {
  const { skipInitial = true, preventScroll = false, enabled = true } = options

  const elementRef = useRef<T>(null)
  const previousValue = useRef<unknown>(NOT_SEEN)

  useEffect(() => {
    const isFirstRun = previousValue.current === NOT_SEEN
    const changed = !Object.is(previousValue.current, value)
    previousValue.current = value

    if (!changed || !enabled) {
      return
    }

    if (isFirstRun && skipInitial) {
      return
    }

    const element = elementRef.current
    if (!element) {
      return
    }

    // Elements such as headings can only take focus from code when they have
    // a tabindex, and -1 keeps them out of the normal tab order.
    if (!element.hasAttribute('tabindex') && element.tabIndex < 0) {
      element.setAttribute('tabindex', '-1')
    }

    element.focus({ preventScroll })
  }, [value, enabled, skipInitial, preventScroll])

  return elementRef
}