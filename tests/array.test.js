import { typedView } from '@exodus/bytes/array.js'
import { describe, test } from 'node:test'

const raw = [new Uint8Array(), new Uint8Array([0]), new Uint8Array([1]), new Uint8Array([255])]
for (let i = 0; i < 50; i++) {
  const size = Math.floor(Math.random() * 100)
  raw.push(crypto.getRandomValues(new Uint8Array(size)))
}

const pool = raw.map((uint8) => {
  const buffer = Buffer.from(uint8)
  return { uint8, buffer, hex: buffer.toString('hex') }
})

describe('typedView', () => {
  test('invalid input', (t) => {
    for (const input of [null, undefined, [], [1, 2], 'string']) {
      t.assert.throws(() => typedView(input))
      for (const form of ['uint8', 'buffer']) {
        t.assert.throws(() => typedView(input, form))
      }
    }
  })

  test('uint8', (t) => {
    for (const { buffer, uint8 } of pool) {
      t.assert.strictEqual(typedView(uint8, 'uint8'), uint8)
      const a = typedView(buffer, 'uint8')
      t.assert.deepStrictEqual(a, uint8)
      t.assert.strictEqual(a.buffer, buffer.buffer)
    }
  })

  test('buffer', (t) => {
    for (const { uint8, buffer } of pool) {
      t.assert.strictEqual(typedView(buffer, 'buffer'), buffer)
      const a = typedView(uint8, 'buffer')
      t.assert.deepStrictEqual(a, buffer)
      t.assert.strictEqual(a.buffer, uint8.buffer)
    }
  })
})
