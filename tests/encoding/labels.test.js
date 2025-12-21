import labels from '../../fallback/encoding.labels.js'
import { encodings } from './fixtures/encodings.cjs'
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
