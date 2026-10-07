import { describe, expect, it } from 'vitest'

import { compareWithContract } from './extract-selectors'
import { RESUME_CLASS_NAMES } from './resume-classes'

const FIRST = RESUME_CLASS_NAMES[0]
const SECOND = RESUME_CLASS_NAMES[1]
const UNKNOWN = 'zz-unknown-marker-class'

/** Serializes a comparison so tests can check what it reports about a class. */
function reportOf(html: string): string {
  return JSON.stringify(compareWithContract(html))
}

describe('compareWithContract', () => {
  describe('quoting styles', () => {
    it('reads a double-quoted class attribute', () => {
      expect(reportOf(`<div class="${UNKNOWN}">text</div>`)).toContain(UNKNOWN)
    })

    it('reads a single-quoted class attribute', () => {
      expect(reportOf(`<div class='${UNKNOWN}'>text</div>`)).toContain(UNKNOWN)
    })

    it('reads an unquoted class attribute', () => {
      expect(reportOf(`<div class=${UNKNOWN}>text</div>`)).toContain(UNKNOWN)
    })

    it('gives the same result for every quoting style', () => {
      const double = compareWithContract(`<div class="${FIRST}">text</div>`)
      const single = compareWithContract(`<div class='${FIRST}'>text</div>`)
      const bare = compareWithContract(`<div class=${FIRST}>text</div>`)

      expect(single).toEqual(double)
      expect(bare).toEqual(double)
    })

    it('reads the attribute name in any letter case', () => {
      const lower = compareWithContract(`<div class="${FIRST}">text</div>`)
      const upper = compareWithContract(`<div CLASS="${FIRST}">text</div>`)

      expect(upper).toEqual(lower)
    })

    it('allows whitespace around the equals sign', () => {
      const tight = compareWithContract(`<div class="${FIRST}">text</div>`)
      const loose = compareWithContract(`<div class = "${FIRST}">text</div>`)

      expect(loose).toEqual(tight)
    })
  })

  describe('several classes', () => {
    it('reads every class in one attribute', () => {
      const html = `<div class="${FIRST} ${UNKNOWN}">text</div>`

      expect(reportOf(html)).toContain(UNKNOWN)
    })

    it('treats extra whitespace between classes as one separator', () => {
      const single = compareWithContract(`<div class="${FIRST} ${SECOND}">x</div>`)
      const spaced = compareWithContract(`<div class="  ${FIRST}   \n ${SECOND}  ">x</div>`)

      expect(spaced).toEqual(single)
    })

    it('combines classes from different elements', () => {
      const together = compareWithContract(
        `<div class="${FIRST}"><span class="${SECOND}">x</span></div>`,
      )
      const oneAttribute = compareWithContract(`<div class="${FIRST} ${SECOND}">x</div>`)

      expect(together).toEqual(oneAttribute)
    })

    it('counts a class that repeats only once', () => {
      const once = compareWithContract(`<div class="${FIRST}">x</div>`)
      const repeated = compareWithContract(
        `<div class="${FIRST} ${FIRST}"><p class="${FIRST}">x</p></div>`,
      )

      expect(repeated).toEqual(once)
    })
  })

  describe('what is not a class', () => {
    it('ignores attributes that only end in class', () => {
      const html = `<div data-class="${UNKNOWN}">text</div>`

      expect(reportOf(html)).not.toContain(UNKNOWN)
    })

    it('ignores other attributes', () => {
      const html = `<div id="${UNKNOWN}" title="${UNKNOWN}">text</div>`

      expect(reportOf(html)).not.toContain(UNKNOWN)
    })

    it('reports nothing about unknown classes for HTML without classes', () => {
      expect(reportOf('<div><p>Plain text</p></div>')).not.toContain(UNKNOWN)
    })
  })

  describe('comparison with the selector contract', () => {
    it('has contract classes to compare with', () => {
      expect(RESUME_CLASS_NAMES.length).toBeGreaterThan(1)
    })

    it('reports a class that is not in the contract', () => {
      const withUnknown = compareWithContract(`<div class="${FIRST} ${UNKNOWN}">x</div>`)
      const withoutUnknown = compareWithContract(`<div class="${FIRST}">x</div>`)

      expect(withUnknown).not.toEqual(withoutUnknown)
      expect(JSON.stringify(withUnknown)).toContain(UNKNOWN)
    })

    it('tells apart HTML that uses contract classes from HTML that uses none', () => {
      const empty = compareWithContract('<div>No classes here</div>')
      const used = compareWithContract(`<div class="${FIRST}">x</div>`)

      expect(used).not.toEqual(empty)
    })

    it('tells apart HTML that uses different contract classes', () => {
      const first = compareWithContract(`<div class="${FIRST}">x</div>`)
      const second = compareWithContract(`<div class="${SECOND}">x</div>`)

      expect(second).not.toEqual(first)
    })

    it('tells apart HTML that uses every contract class from HTML that uses none', () => {
      const html = RESUME_CLASS_NAMES.map((name) => `<div class="${name}">x</div>`).join('\n')

      const full = compareWithContract(html)
      const empty = compareWithContract('')

      expect(full).not.toEqual(empty)
      expect(JSON.stringify(full)).not.toContain(UNKNOWN)
    })

    it('mentions every contract class that the HTML uses', () => {
      const names = RESUME_CLASS_NAMES.slice(0, 3)
      const html = names.map((name) => `<div class="${name}">x</div>`).join('')

      const report = reportOf(html)

      for (const name of names) {
        expect(report).toContain(name)
      }
    })
  })

  describe('robustness', () => {
    it('gives the same result for the same input', () => {
      const html = `<div class="${FIRST} ${UNKNOWN}">x</div>`

      expect(compareWithContract(html)).toEqual(compareWithContract(html))
    })

    it('handles empty HTML', () => {
      expect(() => compareWithContract('')).not.toThrow()
    })

    it('does not throw on odd input', () => {
      const inputs = [
        '<',
        '>',
        'class',
        'class=',
        'class="',
        "class='",
        ' class=""',
        '<div class>',
        '<div class="unterminated',
        '\n\n\t',
      ]

      for (const input of inputs) {
        expect(() => compareWithContract(input)).not.toThrow()
      }
    })

    it('does not change between repeated calls on the same HTML', () => {
      const html = `<div class="${FIRST}">x</div>`

      const first = compareWithContract(html)
      compareWithContract(`<div class="${UNKNOWN}">y</div>`)
      const second = compareWithContract(html)

      expect(second).toEqual(first)
    })
  })
})