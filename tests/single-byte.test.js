import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, describe } from 'node:test'
import { createDecoder } from '@exodus/bytes/single-byte.js'

const encodings = ['windows-1252']

describe('single-byte encodings are supersets of ascii', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createDecoder(encoding)
      for (let i = 0; i < 128; i++) {
        const str = decoder(Uint8Array.of(i))
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
          return { i, code, description }
        })

      t.assert.strictEqual(rows.length, 128)
      for (let i = 0; i < 128; i++) {
        const row = rows[i]
        t.assert.strictEqual(i, row.i)
        const str = decoder(Uint8Array.of(128 + i))
        t.assert.strictEqual(str.length, 1, row.description)
        t.assert.strictEqual(str.codePointAt(0), row.code, row.description)
      }
    })
  }
})
