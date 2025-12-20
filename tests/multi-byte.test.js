import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, describe } from 'node:test'
import { getTable, sizes } from '../fallback/multi-byte.table.js'

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
      const non16bit = encoding === 'big5'
      t.assert.ok(Number.isSafeInteger(size) && size >= 0)
      const table = getTable(encoding)
      t.assert.strictEqual(table.length, size)

      const text = readFileSync(
        join(import.meta.dirname, 'encoding/fixtures/multi-byte', `index-${encoding}.txt`),
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
          t.assert.ok(code && code !== 0xff_fd) // can't be a replacement char
          if (!non16bit) t.assert.ok(code <= 0xff_ff) // has to be <= 16-bit
          t.assert.ok(code < 0xd8_00 || code >= 0xe0_00) // not a surrogate
          return [i, { i, code, description }]
        })

      t.assert.ok(rows.length <= size)
      t.assert.strictEqual(max + 1, size)
      const known = new Map(rows)
      t.assert.strictEqual(rows.length, known.size) // all unique

      for (let i = 0; i < size; i++) {
        const row = known.get(i)
        if (encoding === 'big5' && [1133, 1135, 1164, 1166].includes(i)) {
          // Patch per spec
          t.assert.strictEqual(row, undefined)
          t.assert.strictEqual(typeof table[i], 'string')
          t.assert.strictEqual(table[i].length, 2)
        } else if (row) {
          const expected = non16bit ? String.fromCodePoint(row.code) : row.code
          t.assert.strictEqual(i, row.i)
          t.assert.strictEqual(table[i], expected, `Offset ${i}: ${row.description}`)
        } else {
          t.assert.strictEqual(table[i], non16bit ? undefined : 0xff_fd, `Offset ${i}`)
        }
      }
    })
  }
})

describe('multi-byte ranges tables', () => {
  for (const name of ['gb18030-ranges']) {
    test(name, (t) => {
      const table = getTable(name)

      const text = readFileSync(
        join(import.meta.dirname, 'encoding/fixtures/multi-byte', `index-${name}.txt`),
        'utf8'
      )

      const rows = text
        .split('\n')
        .map((x) => x.trim())
        .filter((x) => x && x[0] !== '#')
        .map((x) => x.split('\t'))
        .map(([as, bs]) => {
          const a = parseInt(as)
          const b = parseInt(bs)
          t.assert.strictEqual(as, `${a}`)
          t.assert.strictEqual(bs, `0x${b.toString(16).toUpperCase().padStart(4, '0')}`)
          return [a, b]
        })

      t.assert.deepStrictEqual(table, rows)
    })
  }
})
