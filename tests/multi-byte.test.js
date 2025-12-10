import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, describe } from 'node:test'
import { getTable, sizes } from '../fallback/multi-byte.table.cjs'

const encodings = Object.keys(sizes)

describe('multi-byte encodings tables are loadable', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      t.assert.ok(Number.isSafeInteger(sizes[encoding]) && sizes[encoding] >= 0)
      const table = getTable(encoding)
      t.assert.strictEqual(getTable(encoding), table) // cached
      t.assert.strictEqual(table.length, sizes[encoding])
    })
  }
})

describe('multi-byte encodings tables', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const size = sizes[encoding]
      t.assert.ok(Number.isSafeInteger(size) && size >= 0)
      const table = getTable(encoding)
      t.assert.strictEqual(table.length, size)

      const text = readFileSync(
        join(import.meta.dirname, 'fixtures/encodings/multi-byte', `index-${encoding}.txt`),
        'utf8'
      )

      let max = 0
      const rows = text
        .split('\n')
        .map((x) => x.trim())
        .filter((x) => x && x[0] !== '#')
        .map((x) => x.split('\t'))
        .map(([istr, codeHex, description]) => {
          const i = Number(istr)
          if (i > max) max = i
          t.assert.ok(i < size)
          const code = parseInt(codeHex.slice(2), 16)
          t.assert.strictEqual(`${i}`, istr)
          t.assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
          t.assert.ok(code && code !== 0xff_fd && code <= 0xff_ff) // can't be a replacement char, has to be <= 16-bit
          t.assert.ok(code < 0xd8_00 || code >= 0xe0_00) // not a surrogate
          return [i, { i, code, description }]
        })

      t.assert.ok(rows.length <= size)
      t.assert.strictEqual(max + 1, size)
      const known = new Map(rows)
      t.assert.strictEqual(rows.length, known.size) // all unique

      for (let i = 0; i < size; i++) {
        const row = known.get(i)
        if (row) {
          t.assert.strictEqual(i, row.i)
          t.assert.strictEqual(table[i], row.code, `Offset ${i}: ${row.description}`)
        } else {
          t.assert.strictEqual(table[i], 0xff_fd, `Offset ${i}`)
        }
      }
    })
  }
})
