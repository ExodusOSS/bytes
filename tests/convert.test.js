import { fromUint8Super, fromHex } from '@exodus/bytes/convert.js'
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

describe('fromUint8Super', () => {
  test('invalid input', (t) => {
    for (const input of [null, undefined, [], [1,2], new Uint16Array(1), 'string']) {
      t.assert.throws(() => fromUint8Super(input))
      for (const form of ['uint8', 'buffer', 'hex']) {
        t.assert.throws(() => fromUint8Super(input, form))
      }
    }
  })

  test('uint8', (t) => {
    for (const { buffer, uint8 } of pool) {
      t.assert.strictEqual(fromUint8Super(uint8), uint8)
      t.assert.strictEqual(fromUint8Super(uint8, 'uint8'), uint8)
      const a = fromUint8Super(buffer)
      const b = fromUint8Super(buffer, 'uint8')
      t.assert.deepStrictEqual(a, uint8)
      t.assert.strictEqual(a.buffer, buffer.buffer)
      t.assert.deepStrictEqual(b, uint8)
      t.assert.strictEqual(b.buffer, buffer.buffer)
    }
  })

  test('buffer', (t) => {
    for (const { uint8, buffer } of pool) {
      t.assert.strictEqual(fromUint8Super(buffer, 'buffer'), buffer)
      const a = fromUint8Super(uint8, 'buffer')
      t.assert.deepStrictEqual(a, buffer)
      t.assert.strictEqual(a.buffer, uint8.buffer)
    }
  })

  test('hex', (t) => {
    for (const { uint8, buffer, hex} of pool) {
      t.assert.strictEqual(fromUint8Super(uint8, 'hex'), hex)
      t.assert.strictEqual(fromUint8Super(buffer, 'hex'), hex)
    }
  })
})

describe('fromHex', () => {
  test('invalid input', (t) => {
    for (const input of [null, undefined, [], [1,2], ['00'], new Uint8Array(), 'a', '0x00', 'ag']) {
      if (Uint8Array.fromHex) t.assert.throws(() => Uint8Array.fromHex(input))
      t.assert.throws(() => fromHex(input))
      for (const form of ['uint8', 'buffer', 'hex']) {
        t.assert.throws(() => fromHex(input, form))
      }
    }
  })

  test('uint8', (t) => {
    for (const { hex, uint8 } of pool) {
      t.assert.deepStrictEqual(fromHex(hex), uint8)
      t.assert.deepStrictEqual(fromHex(hex, 'uint8'), uint8)
    }
  })

  test('buffer', (t) => {
    for (const { hex, buffer } of pool) {
      t.assert.deepStrictEqual(fromHex(hex, 'buffer'), buffer)
    }
  })

  test('hex', (t) => {
    for (const { hex } of pool) t.assert.strictEqual(fromHex(hex, 'hex'), hex)
  })
})
