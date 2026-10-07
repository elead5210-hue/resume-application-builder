import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import * as promptStepModule from './PromptStep'

/**
 * PromptStep is the copy-paste step: it shows a prompt, lets the user copy it,
 * and checks the pasted AI response against a schema before it can be saved.
 *
 * The props are listed in one place. The callback is shared by the usual
 * callback prop names, so the tests only care that the valid, parsed data is
 * handed on, not which name the component uses for it.
 */

const moduleExports = promptStepModule as unknown as Record<string, unknown>
const PromptStep = (moduleExports.default ?? moduleExports.PromptStep) as ComponentType<
  Record<string, unknown>
>

const PROMPT_TEXT = 'PROMPT-MARKER: write the checklist for this job.'
const PREVIEW_MARKER = 'PREVIEW-MARKER'

const schema = z.object({
  name: z.string(),
  count: z.number(),
})

const validJson = JSON.stringify({ name: PREVIEW_MARKER, count: 3 })

const SAVE_BUTTON = /save|use (this|response)|accept|apply|continue|confirm/i
const COPY_BUTTON = /copy/i

function renderStep(overrides: Record<string, unknown> = {}) {
  const onResult = vi.fn()
  const props: Record<string, unknown> = {
    prompt: PROMPT_TEXT,
    schema,
    title: 'Step title',
    onSave: onResult,
    onValid: onResult,
    onSubmit: onResult,
    onAccept: onResult,
    onConfirm: onResult,
    onParsed: onResult,
    onSaved: onResult,
    onComplete: onResult,
    onResponse: onResult,
    renderPreview: (data: unknown) => <pre>{JSON.stringify(data)}</pre>,
    ...overrides,
  }
  const user = userEvent.setup()
  const view = render(<PromptStep {...props} />)
  return { user, onResult, ...view }
}

function pasteArea(container: HTMLElement): HTMLTextAreaElement {
  const area = container.querySelector<HTMLTextAreaElement>(
    'textarea:not([readonly]):not([disabled])',
  )
  if (area === null) {
    throw new Error('Could not find the text area for the pasted response')
  }
  return area
}

function paste(container: HTMLElement, text: string): void {
  fireEvent.change(pasteArea(container), { target: { value: text } })
}

function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: SAVE_BUTTON })
}

function errorsShown(): boolean {
  return (
    screen.queryAllByRole('alert').length > 0 ||
    screen.queryAllByText(/invalid|error|could not|unable|expected|required/i).length > 0
  )
}

describe('PromptStep', () => {
  describe('the prompt', () => {
    it('shows the prompt text', () => {
      renderStep()

      const shown =
        screen.queryAllByDisplayValue(PROMPT_TEXT).length > 0 ||
        screen.queryAllByText(PROMPT_TEXT).length > 0

      expect(shown).toBe(true)
    })
  })

  describe('copy button', () => {
    it('is shown', () => {
      renderStep()

      expect(screen.getAllByRole('button', { name: COPY_BUTTON }).length).toBeGreaterThan(0)
    })

    it('copies the prompt to the clipboard', async () => {
      const { user } = renderStep()

      await user.click(screen.getAllByRole('button', { name: COPY_BUTTON })[0])

      await expect(navigator.clipboard.readText()).resolves.toBe(PROMPT_TEXT)
    })

    it('shows a status message after copying', async () => {
      const { user } = renderStep()

      await user.click(screen.getAllByRole('button', { name: COPY_BUTTON })[0])

      expect(await screen.findByText(/copied/i)).toBeInTheDocument()
    })

    it('does not show the copied message before copying', () => {
      renderStep()

      expect(screen.queryByText(/^copied/i)).not.toBeInTheDocument()
    })
  })

  describe('a bad paste', () => {
    it('shows validation errors for text that is not JSON', async () => {
      const { container } = renderStep()

      paste(container, 'this is definitely not JSON')

      await waitFor(() => {
        expect(errorsShown()).toBe(true)
      })
    })

    it('shows validation errors for JSON that does not match the schema', async () => {
      const { container } = renderStep()

      paste(container, '{"name": "Resume"}')

      await waitFor(() => {
        expect(errorsShown()).toBe(true)
      })
      expect(document.body.textContent ?? '').toContain('count')
    })

    it('does not show the parsed preview', async () => {
      const { container } = renderStep()

      paste(container, '{"name": 5, "count": "x"}')

      await waitFor(() => {
        expect(errorsShown()).toBe(true)
      })
      expect(screen.queryByText(new RegExp(PREVIEW_MARKER))).not.toBeInTheDocument()
    })

    it('keeps the save button disabled', async () => {
      const { container } = renderStep()

      paste(container, 'this is definitely not JSON')

      await waitFor(() => {
        expect(errorsShown()).toBe(true)
      })
      expect(saveButton()).toBeDisabled()
    })

    it('does not hand anything on when the save button is clicked', async () => {
      const { container, user, onResult } = renderStep()

      paste(container, 'this is definitely not JSON')
      await user.click(saveButton())

      expect(onResult).not.toHaveBeenCalled()
    })
  })

  describe('a valid paste', () => {
    it('shows the parsed preview', async () => {
      const { container } = renderStep()

      paste(container, validJson)

      expect((await screen.findAllByText(new RegExp(PREVIEW_MARKER))).length).toBeGreaterThan(0)
    })

    it('shows no validation errors', async () => {
      const { container } = renderStep()

      paste(container, validJson)

      await screen.findAllByText(new RegExp(PREVIEW_MARKER))
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })

    it('accepts a response wrapped in a code fence and chatty text', async () => {
      const fence = '`'.repeat(3)
      const { container } = renderStep()

      paste(container, `Here you go:\n${fence}json\n${validJson}\n${fence}\nEnjoy!`)

      expect((await screen.findAllByText(new RegExp(PREVIEW_MARKER))).length).toBeGreaterThan(0)
    })

    it('replaces the errors once the paste is fixed', async () => {
      const { container } = renderStep()

      paste(container, 'this is definitely not JSON')
      await waitFor(() => {
        expect(errorsShown()).toBe(true)
      })

      paste(container, validJson)

      expect((await screen.findAllByText(new RegExp(PREVIEW_MARKER))).length).toBeGreaterThan(0)
      await waitFor(() => {
        expect(screen.queryAllByRole('alert')).toHaveLength(0)
      })
    })
  })

  describe('save button', () => {
    it('is disabled before anything is pasted', () => {
      renderStep()

      expect(saveButton()).toBeDisabled()
    })

    it('is enabled once a valid response is pasted', async () => {
      const { container } = renderStep()

      paste(container, validJson)

      await waitFor(() => {
        expect(saveButton()).toBeEnabled()
      })
    })

    it('is disabled again when the paste is cleared', async () => {
      const { container } = renderStep()

      paste(container, validJson)
      await waitFor(() => {
        expect(saveButton()).toBeEnabled()
      })

      paste(container, '')

      await waitFor(() => {
        expect(saveButton()).toBeDisabled()
      })
    })

    it('hands the parsed data on when clicked', async () => {
      const { container, user, onResult } = renderStep()

      paste(container, validJson)
      await waitFor(() => {
        expect(saveButton()).toBeEnabled()
      })
      await user.click(saveButton())

      expect(onResult).toHaveBeenCalled()
      expect(JSON.stringify(onResult.mock.calls[0])).toContain(PREVIEW_MARKER)
    })
  })
})