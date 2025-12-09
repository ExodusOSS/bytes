import { TextDecoder, TextEncoder } from '@exodus/bytes/text-encoding.js'
import { test } from 'node:test'
import unfinishedBytesFixtures from './fixtures/text-encoding.unfinishedBytes.js'

test('Unfinished bytes', (t) => {
  for (const [encoding, trail, u8] of unfinishedBytesFixtures) {
    const decoder = new TextDecoder(encoding)
    const a0 = decoder.decode(u8, { stream: true })
    const b0 = decoder.decode()
    const ab = new TextDecoder(encoding).decode(u8)
    const a1 = new TextDecoder(encoding).decode(u8.subarray(0, u8.length - trail))
    const b1 = new TextDecoder(encoding).decode(u8.subarray(u8.length - trail))
    t.assert.strictEqual(a0, a1)
    t.assert.strictEqual(b0, b1)
    t.assert.strictEqual(a0 + b0, ab)
    t.assert.strictEqual(decoder.decode(u8), ab) // reuse

    if (trail === 0) {
      t.assert.strictEqual(a0, ab)
      t.assert.strictEqual(b0, '')
    }

    if (trail === u8.length) {
      t.assert.strictEqual(a0, '')
      t.assert.strictEqual(b0, ab)
    }
  }
})

test('String coercion', (t) => {
  const encoder = new TextEncoder()
  const map = [
    [{}, '[object Object]'],
    [null, 'null'],
    [undefined, 'undefined'],
  ]

  for (const [arg, string] of map) {
    const length = string.length
    const a = encoder.encode(string)
    t.assert.strictEqual(a.length, length)

    const b = encoder.encode(arg)
    if (arg === undefined) {
      // undefined is special
      t.assert.strictEqual(b.length, 0)
      t.assert.deepStrictEqual(b, Uint8Array.of())
    } else {
      const b = encoder.encode(arg)
      t.assert.strictEqual(b.length, length)
      t.assert.deepStrictEqual(b, a)
    }

    const c = new Uint8Array(20)
    t.assert.deepStrictEqual(encoder.encodeInto(arg, c), { read: length, written: length })
    t.assert.deepStrictEqual(c.subarray(0, length), a)
  }
})

// https://encoding.spec.whatwg.org/#x-user-defined-decoder
test('x-user-defined encoding', (t) => {
  const decoder = new TextDecoder('x-user-defined')
  for (let byte = 0; byte < 256; byte++) {
    const codePoint = byte >= 128 ? 0xf7_80 + byte - 0x80 : byte
    t.assert.strictEqual(decoder.decode(Uint8Array.of(byte)), String.fromCodePoint(codePoint))
  }
})
