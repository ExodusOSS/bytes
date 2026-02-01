import { createMultibyteEncoder } from '@exodus/bytes/multi-byte.js'
import { percentEncodeAfterEncoding } from '@exodus/bytes/whatwg.js'
import '@exodus/bytes/encoding.js'
import { encodeLatin1 } from '../../fallback/latin1.js'
import { describe, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const specialquery = ` "#'<>` // https://url.spec.whatwg.org/#special-query-percent-encode-set

const { unescape } = globalThis

function testEncoder(encoding, fn) {
  describe(encoding, () => {
    const fatal = createMultibyteEncoder(encoding)
    fn((input, escaped, desc) => {
      test(desc, (t) => {
        // Coherence
        if (escaped.includes('%26%23')) {
          t.assert.throws(() => fatal(input))
        } else {
          const bytes = fatal(input) // does not throw
          if (unescape) t.assert.deepStrictEqual(bytes, encodeLatin1(unescape(escaped)))
        }

        // Full check
        t.assert.strictEqual(percentEncodeAfterEncoding(encoding, input, specialquery), escaped)
      })
    })
  })
}

testEncoder('big5', (encode) => {
  // From https://github.com/web-platform-tests/wpt/blob/master/encoding/big5-encoder.html

  encode('ab', 'ab', 'very basic')
  // edge cases
  encode('\u9EA6', '%26%2340614%3B', 'Highest-pointer BMP character excluded from encoder')
  encode('\uD858\uDE6B', '%26%23156267%3B', 'Highest-pointer character excluded from encoder')
  encode('\u3000', '%A1@', 'Lowest-pointer character included in encoder')
  encode(
    '\u20AC',
    '%A3%E1',
    'Euro; the highest-pointer character before a range of 30 unmapped pointers'
  )
  encode('\u4E00', '%A4@', 'The lowest-pointer character after the range of 30 unmapped pointers')
  encode(
    '\uD85D\uDE07',
    '%C8%A4',
    'The highest-pointer character before a range of 41 unmapped pointers'
  )
  encode('\uFFE2', '%C8%CD', 'The lowest-pointer character after the range of 41 unmapped pointers')
  encode('\u79D4', '%FE%FE', 'The last character in the index')
  // not in index
  encode('\u2603', '%26%239731%3B', 'The canonical BMP test character that is not in the index')
  encode(
    '\uD83D\uDCA9',
    '%26%23128169%3B',
    'The canonical astral test character that is not in the index'
  )
  // duplicate low bits
  encode(
    '\uD840\uDFB5',
    '%FDj',
    'A Plane 2 character whose low 16 bits match a BMP character that has a lower pointer'
  )
  // prefer last
  encode(
    '\u2550',
    '%F9%F9',
    'A duplicate-mapped code point that prefers the highest pointer in the encoder'
  )
})

testEncoder('iso-2022-jp', (encode) => {
  // From https://github.com/web-platform-tests/wpt/blob/master/encoding/iso-2022-jp-encoder.html
  encode('\x0E\x0F\x1Bx', '%26%2365533%3B%26%2365533%3B%26%2365533%3Bx', 'SO/SI ESC')
  encode(
    '\u203E\x0E\x0F\x1Bx',
    '%1B(J~%26%2365533%3B%26%2365533%3B%26%2365533%3Bx%1B(B',
    'Roman SO/SI ESC'
  )
  encode(
    '\uFF61\x0E\x0F\x1Bx',
    '%1B$B!%23%1B(B%26%2365533%3B%26%2365533%3B%26%2365533%3Bx',
    'Katakana SO/SI ESC'
  )
  encode(
    '\u0393\x0E\x0F\x1Bx',
    '%1B$B&%23%1B(B%26%2365533%3B%26%2365533%3B%26%2365533%3Bx',
    'jis0208 SO/SI ESC'
  )
  encode('\uFFFD', '%26%2365533%3B', 'U+FFFD')
  encode('\u203E\uFFFD', '%1B(J~%26%2365533%3B%1B(B', 'Roman U+FFFD')
  encode('\uFF61\uFFFD', '%1B$B!%23%1B(B%26%2365533%3B', 'Katakana U+FFFD')
  encode('\u0393\uFFFD', '%1B$B&%23%1B(B%26%2365533%3B', 'jis0208 U+FFFD')
})

test('url/resources/percent-encoding.json', (t) => {
  const data = JSON.parse(
    readFileSync(join(import.meta.dirname, `fixtures/url/resources/percent-encoding.json`), 'utf8')
  )

  // Doc: https://github.com/web-platform-tests/wpt/blob/master/url/README.md
  // > _percentEncodeSet_ set to special-query percent-encode set and _spaceAsPlus_ set to false.
  const set = specialquery
  const spaceAsPlus = false
  for (const { input, output } of data) {
    if (!input && !output) continue // comment
    for (const [encoding, escaped] of Object.entries(output)) {
      t.assert.strictEqual(percentEncodeAfterEncoding(encoding, input, set, spaceAsPlus), escaped)
    }
  }
})
