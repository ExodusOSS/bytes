import labels from '../../fallback/encoding.labels.js'
import { encodings } from './fixtures/encodings.cjs'
import { labelToName, normalizeEncoding } from '@exodus/bytes/encoding.js'
import { test } from 'node:test'

test('labels dataset matches spec', (t) => {
  const expected = []
  for (const row of encodings) {
    const name = row.name.toLowerCase()
    t.assert.ok(row.labels.includes(name))
    expected.push([name, row.labels.filter((x) => x !== name).sort()])
  }

  const sorted = Object.entries(labels)
    .map(([name, labels]) => [name, [...labels].sort()])
    .sort()

  t.assert.deepStrictEqual(sorted, expected.sort())
})

test('normalizeEncoding', (t) => {
  t.assert.strictEqual(normalizeEncoding('Utf-8'), 'utf-8')
  t.assert.strictEqual(normalizeEncoding('Utf-7'), null)
  for (const x of [null, undefined, {}, [], '', 0, 1]) {
    t.assert.strictEqual(normalizeEncoding(x), null)
  }

  for (const row of encodings) {
    const normalized = row.name.toLowerCase()
    t.assert.ok(row.labels.includes(normalized))
    for (const label of row.labels) {
      t.assert.strictEqual(normalizeEncoding(label), normalized)
    }
  }
})

test('labelToName', (t) => {
  t.assert.strictEqual(labelToName('Utf-8'), 'UTF-8')
  t.assert.strictEqual(labelToName('Utf-7'), null)
  for (const x of [null, undefined, {}, [], '', 0, 1]) {
    t.assert.strictEqual(labelToName(x), null)
  }

  for (const row of encodings) {
    for (const label of row.labels) {
      t.assert.strictEqual(labelToName(label), row.name)
    }
  }
})
