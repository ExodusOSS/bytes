// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/encoding.js'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, describe } from 'node:test'
import { legacySingleByte as encodings } from './fixtures/encodings.cjs'

describe('single-byte encodings are supersets of ascii', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const loose = new TextDecoder(encoding)
      const fatal = new TextDecoder(encoding, { fatal: true })
      for (let i = 0; i < 128; i++) {
        const str = String.fromCodePoint(i)
        t.assert.strictEqual(loose.decode(Uint8Array.of(i)), str, i)
        t.assert.strictEqual(fatal.decode(Uint8Array.of(i)), str, i)
      }
    })
  }
})

describe('single-byte encodings index', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const loose = new TextDecoder(encoding)
      const fatal = new TextDecoder(encoding, { fatal: true })
      const file = encoding === 'iso-8859-8-i' ? `index-iso-8859-8.txt` : `index-${encoding}.txt`
      const text = readFileSync(join(import.meta.dirname, './fixtures/single-byte', file), 'utf8')
      const rows = text
        .split('\n')
        .map((x) => x.trim())
        .filter((x) => x && x[0] !== '#')
        .map((x) => x.split('\t'))
        .map(([istr, codeHex, description]) => {
          const i = Number(istr)
          t.assert.ok(i < 128)
          const code = parseInt(codeHex.slice(2), 16)
          t.assert.strictEqual(`${i}`, istr)
          t.assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
          t.assert.ok(code && code !== 0xff_fd && code <= 0xff_ff) // Can't be a replacement char, has to be <= 16-bit
          t.assert.ok(code < 0xd8_00 || code >= 0xe0_00) // not a surrogate
          return [i, { i, code, description }]
        })

      t.assert.ok(rows.length <= 128)
      const known = new Map(rows)
      t.assert.strictEqual(rows.length, known.size) // all unique

      for (let i = 0; i < 128; i++) {
        const row = known.get(i)
        const byte = i + 128
        if (row) {
          t.assert.strictEqual(i, row.i)
          const str = String.fromCodePoint(row.code)
          t.assert.strictEqual(fatal.decode(Uint8Array.of(byte)), str, row.description)
          t.assert.strictEqual(loose.decode(Uint8Array.of(byte)), str, row.description)
        } else {
          t.assert.throws(() => fatal.decode(Uint8Array.of(byte)), TypeError)
          t.assert.strictEqual(loose.decode(Uint8Array.of(byte)), '\uFFFD')
        }
      }
    })
  }
})

// https://encoding.spec.whatwg.org/#x-user-defined-decoder
test('x-user-defined', (t) => {
  const encoding = 'x-user-defined'
  const loose = new TextDecoder(encoding)
  const fatal = new TextDecoder(encoding, { fatal: true })
  for (let byte = 0; byte < 256; byte++) {
    const str = String.fromCodePoint(byte >= 0x80 ? 0xf7_80 + byte - 0x80 : byte)
    t.assert.strictEqual(fatal.decode(Uint8Array.of(byte)), str, byte)
    t.assert.strictEqual(loose.decode(Uint8Array.of(byte)), str, byte)
  }
})
