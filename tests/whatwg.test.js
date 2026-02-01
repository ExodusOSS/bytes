import '@exodus/bytes/encoding.js'
import { percentEncodeAfterEncoding } from '@exodus/bytes/whatwg.js'
import { describe, test } from 'node:test'
import { labels } from './encoding/fixtures/encodings.cjs'

const jsuri = ' "%<>[\\]^`{|}' // https://tc39.es/ecma262/#sec-encodeuri-uri
const jsuricomponent = ' "#$%&+,/:;<=>?@[\\]^`{|}' // https://tc39.es/ecma262/#sec-encodeuricomponent-uricomponent
const fragment = ' "<>`' // https://url.spec.whatwg.org/#fragment-percent-encode-set
const query = ' "#<>' // https://url.spec.whatwg.org/#query-percent-encode-set
const specialquery = ' "#\'<>' // https://url.spec.whatwg.org/#special-query-percent-encode-set
const path = ' "#<>?^`{}' // https://url.spec.whatwg.org/#path-percent-encode-set
const userinfo = ' "#/:;<=>?@[\\]^`{|}' // https://url.spec.whatwg.org/#userinfo-percent-encode-set
const component = ' "#$%&+,/:;<=>?@[\\]^`{|}' // https://url.spec.whatwg.org/#component-percent-encode-set
const form = ' !"#$%&\'()+,/:;<=>?@[\\]^`{|}~' // https://url.spec.whatwg.org/#application-x-www-form-urlencoded-percent-encode-set

const sets = ['', userinfo, jsuri, jsuricomponent]
const invalid = new Set(['replacement', 'utf-16le', 'utf-16be']) // https://encoding.spec.whatwg.org/#get-an-encoder

const slowEngine =
  process.env.EXODUS_TEST_PLATFORM === 'quickjs' ||
  process.env.EXODUS_TEST_PLATFORM === 'xs' ||
  process.env.EXODUS_TEST_PLATFORM === 'engine262'

test('percent-encode sets coherence', (t) => {
  const eq = (a, b) => t.assert.deepStrictEqual([...a], [...b].sort())
  // https://tc39.es/ecma262/#sec-encodeuri-uri step 2
  eq(jsuricomponent, jsuri + ';/?:@&=+$,#')
  // https://url.spec.whatwg.org/#fragment-percent-encode-set
  eq(fragment, String.fromCharCode(0x20, 0x22, 0x3c, 0x3e, 0x60))
  // https://url.spec.whatwg.org/#query-percent-encode-set
  eq(query, String.fromCharCode(0x20, 0x22, 0x23, 0x3c, 0x3e))
  // https://url.spec.whatwg.org/#special-query-percent-encode-set
  eq(specialquery, query + String.fromCharCode(0x27))
  // https://url.spec.whatwg.org/#path-percent-encode-set
  eq(path, query + String.fromCharCode(0x3f, 0x5e, 0x60, 0x7b, 0x7d))
  // https://url.spec.whatwg.org/#userinfo-percent-encode-set
  eq(userinfo, path + String.fromCharCode(0x2f, 0x3a, 0x3b, 0x3d, 0x40, 0x5b, 0x5c, 0x5d, 0x7c))
  // https://url.spec.whatwg.org/#component-percent-encode-set
  eq(component, userinfo + String.fromCharCode(0x24, 0x25, 0x26, 0x2b, 0x2c))
  t.assert.strictEqual(jsuricomponent, component)
  // https://url.spec.whatwg.org/#application-x-www-form-urlencoded-percent-encode-set
  eq(form, component + String.fromCharCode(0x21, 0x27, 0x28, 0x29, 0x7e))
})

describe('percent-encode after encoding', () => {
  const f = percentEncodeAfterEncoding

  // https://url.spec.whatwg.org/#example-percent-encode-operations
  test('examples from spec', (t) => {
    // At https://github.com/whatwg/url/commit/5c50135f8304dc8cb9bb49367b364699cc5bb031
    t.assert.strictEqual(f('Shift_JIS', ' ', userinfo), '%20')
    t.assert.strictEqual(f('Shift_JIS', '≡', userinfo), '%81%DF')
    t.assert.strictEqual(f('Shift_JIS', '‽', userinfo), '%26%238253%3B')
    t.assert.strictEqual(f('ISO-2022-JP', '¥', userinfo), '%1B(J%5C%1B(B')
    t.assert.strictEqual(
      f('Shift_JIS', '1+1 ≡ 2%20‽', userinfo, true),
      '1+1+%81%DF+2%20%26%238253%3B'
    )
    t.assert.strictEqual(f('UTF-8', '≡', userinfo), '%E2%89%A1')
    t.assert.strictEqual(f('UTF-8', '‽', userinfo), '%E2%80%BD')
    t.assert.strictEqual(f('UTF-8', 'Say what‽', userinfo), 'Say%20what%E2%80%BD')

    // At https://github.com/whatwg/url/pull/896
    t.assert.strictEqual(f('Shift_JIS', ' ', specialquery), '%20')
    t.assert.strictEqual(f('Shift_JIS', '≡', specialquery), '%81%DF')
    t.assert.strictEqual(f('Shift_JIS', '‽', specialquery), '%26%238253%3B')
    t.assert.strictEqual(f('ISO-2022-JP', '¥', specialquery), '%1B(J\\%1B(B')
    t.assert.strictEqual(
      f('Shift_JIS', '1+1 ≡ 2%20‽', form, true),
      '1%2B1+%81%DF+2%2520%26%238253%3B'
    )
    t.assert.strictEqual(f('UTF-8', '≡', userinfo), '%E2%89%A1')
    t.assert.strictEqual(f('UTF-8', '‽', userinfo), '%E2%80%BD')
    t.assert.strictEqual(f('UTF-8', 'Say what‽', userinfo), 'Say%20what%E2%80%BD')
  })

  // https://encoding.spec.whatwg.org/#get-an-encoder
  describe('throws on unknown, utf-16 and replacement', () => {
    for (const encoding of [...invalid, 'what', 'UTF-16', 'unicode']) {
      test(encoding, (t) => {
        for (const set of sets) {
          t.assert.throws(() => f(encoding, '', set), /encoding/)
          t.assert.throws(() => f(encoding, ' ', set), /encoding/)
          t.assert.throws(() => f(encoding, ' ', set, true), /encoding/)
          t.assert.throws(() => f(encoding, '\uFFFD', set, true), /encoding/)
        }
      })
    }
  })

  describe('all valid encodings are recognized', () => {
    for (const encoding of labels) {
      if (invalid.has(encoding)) continue
      test(encoding, (t) => {
        for (const set of sets) {
          t.assert.strictEqual(f(encoding, '', set), '')
          // Even non-ASCII encodings passthrough on a lone space
          t.assert.strictEqual(f(encoding, ' ', set), set.includes(' ') ? '%20' : ' ')
          t.assert.strictEqual(f(encoding, ' ', set, true), '+')
        }
      })
    }
  })

  describe('replaces non-scalarvalue', () => {
    for (const encoding of labels) {
      if (invalid.has(encoding)) continue
      test(encoding, (t) => {
        const a = f(encoding, '\uFFFD', userinfo)
        const b = f(encoding, '\uFFFD', jsuri)
        for (let cp = 0xd8_00; cp < 0xe0_00; cp++) {
          const s = String.fromCodePoint(cp)
          t.assert.strictEqual(f(encoding, s, userinfo), a)
          t.assert.strictEqual(f(encoding, s, jsuri), b)
        }
      })
    }
  })

  describe('encodeURI / encodeURIComponent', () => {
    describe('ASCII supersets', (t) => {
      const ascii = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).join('')
      for (const encoding of labels) {
        if (invalid.has(encoding)) continue
        if (encoding === 'iso-2022-jp') continue // not an ASCII superset
        test(encoding, (t) => {
          t.assert.strictEqual(f(encoding, ascii, jsuricomponent), encodeURIComponent(ascii))
          t.assert.strictEqual(f(encoding, ascii, jsuri), encodeURI(ascii))
          for (let i = 0; i < 128; i++) {
            const s = String.fromCharCode(i)
            t.assert.strictEqual(f(encoding, s, jsuricomponent), encodeURIComponent(s))
            t.assert.strictEqual(f(encoding, s, jsuri), encodeURI(s))
          }
        })
      }
    })

    test('UTF-8: full Unicode', (t) => {
      const MAX = slowEngine ? 0x1_ff_ff : 0x10_ff_ff // Max Unicode codepoint
      for (let cp = 0; cp <= MAX; cp++) {
        if (cp >= 0xd8_00 && cp < 0xe0_00) continue
        const s = String.fromCodePoint(cp)
        t.assert.strictEqual(f('utf8', s, jsuricomponent), encodeURIComponent(s))
        t.assert.strictEqual(f('utf8', s, jsuri), encodeURI(s))
      }
    })
  })
})
