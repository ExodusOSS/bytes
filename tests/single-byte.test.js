import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, describe } from 'node:test'
import { createSinglebyteDecoder } from '@exodus/bytes/single-byte.js'
import { encodingDecoder } from '../fallback/single-byte.js'
import encodingsObject from '../fallback/single-byte.encodings.js'

const encodings = Object.keys(encodingsObject)

describe('single-byte encodings are supersets of ascii', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createSinglebyteDecoder(encoding)
      for (let i = 0; i < 128; i++) {
        let str
        try {
          str = decoder(Uint8Array.of(i))
        } catch (cause) {
          throw new Error(`Error decoding ${i} in ${encoding}`, { cause })
        }

        t.assert.strictEqual(str.length, 1, i)
        t.assert.strictEqual(str.codePointAt(0), i, i)
      }
    })
  }
})

describe('single-byte encodings match fallback', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createSinglebyteDecoder(encoding)
      const decoderLoose = createSinglebyteDecoder(encoding, true)
      const fallback = encodingDecoder(encoding)
      for (let i = 0; i < 256; i++) {
        const u8 = Uint8Array.of(i)
        let found = false
        let str
        try {
          str = decoder(u8)
          found = true
        } catch {}

        if (found) {
          t.assert.strictEqual(str.length, 1)
          t.assert.notEqual(str, '\uFFFD')
          t.assert.strictEqual(decoderLoose(u8), str)
          t.assert.strictEqual(fallback(u8), str)
          t.assert.strictEqual(fallback(u8, true), str)
        } else {
          t.assert.ok(i >= 128)
          t.assert.throws(() => fallback(u8))
          str = decoderLoose(u8)
          t.assert.strictEqual(str.length, 1)
          t.assert.strictEqual(str, '\uFFFD')
          t.assert.strictEqual(fallback(u8, true), str)
        }
      }
    })
  }
})

describe('single-byte encodings index', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createSinglebyteDecoder(encoding)
      const decoderLoose = createSinglebyteDecoder(encoding, true)
      const text = readFileSync(
        join(import.meta.dirname, 'fixtures/encoding/single-byte', `index-${encoding}.txt`),
        'utf8'
      )
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
          t.assert.ok(code && code !== 0xff_fd && code <= 0xff_ff) // can't be a replacement char, has to be <= 16-bit
          t.assert.ok(code < 0xd8_00 || code >= 0xe0_00) // not a surrogate
          return [i, { i, code, description }]
        })

      t.assert.ok(rows.length <= 128)
      const known = new Map(rows)
      t.assert.strictEqual(rows.length, known.size) // all unique

      for (let i = 0; i < 128; i++) {
        const row = known.get(i)
        const byte = i + 128
        let str
        if (row) {
          t.assert.strictEqual(i, row.i)
          try {
            str = decoder(Uint8Array.of(byte))
          } catch (cause) {
            throw new Error(`Error decoding ${byte} in ${encoding}: ${row.description}`, { cause })
          }

          t.assert.strictEqual(str.length, 1, row.description)
          t.assert.strictEqual(str.codePointAt(0), row.code, row.description)
          t.assert.strictEqual(str, decoderLoose(Uint8Array.of(byte)))
        } else {
          t.assert.throws(() => decoder(Uint8Array.of(byte)))
          try {
            str = decoderLoose(Uint8Array.of(byte))
          } catch (cause) {
            throw new Error(`Error decoding unmapped ${byte} in ${encoding}`, { cause })
          }

          t.assert.strictEqual(str.length, 1)
          t.assert.strictEqual(str.codePointAt(0), 0xff_fd)
        }
      }
    })
  }
})

// https://encoding.spec.whatwg.org/#x-user-defined-decoder
test('x-user-defined', (t) => {
  const encoding = 'x-user-defined'
  const decoder = createSinglebyteDecoder(encoding)
  const decoderLoose = createSinglebyteDecoder(encoding, true)
  for (let byte = 0; byte < 256; byte++) {
    const str = String.fromCodePoint(byte >= 0x80 ? 0xf7_80 + byte - 0x80 : byte)
    t.assert.strictEqual(decoder(Uint8Array.of(byte)), str, byte)
    t.assert.strictEqual(decoderLoose(Uint8Array.of(byte)), str, byte)
  }
})
