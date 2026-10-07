import { describe, expect, it } from 'vitest'

import { validateCss } from './validate-css'

/** Collects every message the validator reports, whatever list it is kept in. */
function messagesOf(css: string): string[] {
  const result = validateCss(css) as unknown as Record<string, unknown>
  const messages: string[] = []
  for (const value of Object.values(result)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') {
          messages.push(entry)
        }
      }
    }
  }
  return messages
}

const VALID_CSS = [
  '.resume {',
  '  font-family: Georgia, serif;',
  '  color: #111;',
  '}',
  '',
  '.resume-name {',
  '  font-size: 24pt;',
  '}',
].join('\n')

describe('validateCss', () => {
  describe('empty CSS', () => {
    it('is not valid for an empty string', () => {
      const result = validateCss('')

      expect(result.valid).toBe(false)
      expect(messagesOf('').length).toBeGreaterThan(0)
    })

    it('is not valid for whitespace only', () => {
      const result = validateCss('   \n\t  ')

      expect(result.valid).toBe(false)
      expect(messagesOf('   \n\t  ').length).toBeGreaterThan(0)
    })
  })

  describe('unbalanced braces', () => {
    it('is not valid when a closing brace is missing', () => {
      const css = '.resume { color: red;'

      expect(validateCss(css).valid).toBe(false)
      expect(messagesOf(css).length).toBeGreaterThan(0)
    })

    it('is not valid when there is an extra closing brace', () => {
      const css = '.resume { color: red; } }'

      expect(validateCss(css).valid).toBe(false)
      expect(messagesOf(css).length).toBeGreaterThan(0)
    })

    it('is not valid when a nested block is left open', () => {
      const css = '@media print { .resume { color: red; }'

      expect(validateCss(css).valid).toBe(false)
    })

    it('reports readable messages', () => {
      for (const message of messagesOf('.resume { color: red;')) {
        expect(message.trim().length).toBeGreaterThan(0)
        expect(message).not.toContain('[object Object]')
      }
    })
  })

  describe('unclosed comments', () => {
    it('is not valid when a comment is never closed', () => {
      const css = '.resume { color: red; } /* the rest is lost'

      expect(validateCss(css).valid).toBe(false)
      expect(messagesOf(css).length).toBeGreaterThan(0)
    })

    it('is valid when a comment is closed', () => {
      const css = `/* page styling */\n${VALID_CSS}`

      expect(validateCss(css).valid).toBe(true)
    })
  })

  describe('@import', () => {
    it('is not valid with an @import of a url', () => {
      const css = `@import url("https://example.com/fonts.css");\n${VALID_CSS}`

      expect(validateCss(css).valid).toBe(false)
      expect(messagesOf(css).length).toBeGreaterThan(0)
    })

    it('is not valid with an @import of a plain string', () => {
      const css = `@import 'other.css';\n${VALID_CSS}`

      expect(validateCss(css).valid).toBe(false)
    })
  })

  describe('external url() references', () => {
    it('is not valid with an https url in a quoted url()', () => {
      const css = '.resume { background: url("https://example.com/bg.png"); }'

      expect(validateCss(css).valid).toBe(false)
      expect(messagesOf(css).length).toBeGreaterThan(0)
    })

    it('is not valid with an http url in a single-quoted url()', () => {
      const css = ".resume { background: url('http://example.com/bg.png'); }"

      expect(validateCss(css).valid).toBe(false)
    })

    it('is not valid with an unquoted external url()', () => {
      const css = '.resume { background: url(https://example.com/bg.png); }'

      expect(validateCss(css).valid).toBe(false)
    })

    it('is not valid with a protocol-relative url()', () => {
      const css = '.resume { background: url(//example.com/bg.png); }'

      expect(validateCss(css).valid).toBe(false)
    })
  })

  describe('valid CSS', () => {
    it('is valid for ordinary rules', () => {
      expect(validateCss(VALID_CSS).valid).toBe(true)
    })

    it('is valid for rules inside an @media block', () => {
      const css = `${VALID_CSS}\n\n@media print {\n  .resume { margin: 0; }\n}`

      expect(validateCss(css).valid).toBe(true)
    })

    it('is valid when a string value holds a brace', () => {
      const css = ".resume-name::after { content: '}'; }"

      expect(validateCss(css).valid).toBe(true)
    })

    it('gives the same result for the same input', () => {
      expect(validateCss(VALID_CSS)).toEqual(validateCss(VALID_CSS))
    })

    it('does not throw on odd input', () => {
      const inputs = ['{', '}', '/*', '*/', '"', "'", 'url(', '@import', '{{{{', '}}}}']

      for (const input of inputs) {
        expect(() => validateCss(input)).not.toThrow()
      }
    })
  })
})