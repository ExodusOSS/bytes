import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, describe } from 'node:test'
import { createDecoder } from '@exodus/bytes/single-byte.js'
import encodingsObject from '../fallback/single-byte.encodings.js'

const encodings = Object.keys(encodingsObject)

describe('single-byte encodings are supersets of ascii', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createDecoder(encoding)
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

describe('single-byte encodings index', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createDecoder(encoding)
      const text = readFileSync(
        join(import.meta.dirname, 'fixtures/encodings/single-byte', `index-${encoding}.txt`),
        'utf8'
      )
      const rows = text
        .split('\n')
        .map((x) => x.trim())
        .filter((x) => x && x[0] !== '#')
        .map((x) => x.split('\t'))
        .map(([istr, codeHex, description]) => {
          const i = Number(istr)
          const code = parseInt(codeHex.slice(2), 16)
          t.assert.strictEqual(`${i}`, istr)
          t.assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
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
          t.assert.strictEqual(str, decoder(Uint8Array.of(byte), true))
        } else {
          t.assert.throws(() => decoder(Uint8Array.of(byte)))
          try {
            str = decoder(Uint8Array.of(byte), true)
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
