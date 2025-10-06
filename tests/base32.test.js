import { toBase32, toBase32hex, fromBase32, fromBase32hex } from '@exodus/bytes/base32.js'
import { describe, test } from 'node:test'
import base32js from 'base32.js'
import hiBase32 from 'hi-base32'

const raw = [new Uint8Array(), new Uint8Array([0]), new Uint8Array([1]), new Uint8Array([255])]
for (let i = 0; i < 50; i++) {
  const size = Math.floor(Math.random() * 100)
  raw.push(crypto.getRandomValues(new Uint8Array(size)))
}

const pad = (x) => (x.length % 8 === 0 ? x : x + '='.repeat(8 - (x.length % 8)))
const pool = raw.map((uint8) => {
  const buffer = Buffer.from(uint8)
  const base32 = base32js.encode(uint8)
  const base32hex = base32js.encode(uint8, { type: 'base32hex' })
  const base32padded = pad(base32)
  if (base32hex.length !== base32.length) throw new Error('Unexpected base32hex length')
  if (base32padded !== hiBase32.encode(uint8)) throw new Error('Unexpected mismatch with hiBase32')
  const base32hexPadded = pad(base32hex)
  const hex = buffer.toString('hex')
  return { uint8, buffer, hex, base32, base32padded, base32hex, base32hexPadded }
})

describe('toBase32', () => {
  describe('invalid input', () => {
    for (const method of [toBase32, toBase32hex]) {
      test(method.name, (t) => {
        for (const input of [null, undefined, [], [1, 2], new Uint16Array(1), 'string']) {
          t.assert.throws(() => method(input))
        }
      })
    }
  })

  test('base32', (t) => {
    for (const { uint8, buffer, base32, base32padded } of pool) {
      t.assert.strictEqual(toBase32(uint8), base32)
      t.assert.strictEqual(toBase32(buffer), base32)
      t.assert.strictEqual(toBase32(uint8, { padding: false }), base32)
      t.assert.strictEqual(toBase32(uint8, { padding: true }), base32padded)
    }
  })

  test('base32hex', (t) => {
    for (const { uint8, buffer, base32hex, base32hexPadded } of pool) {
      t.assert.strictEqual(toBase32hex(uint8), base32hex)
      t.assert.strictEqual(toBase32hex(buffer), base32hex)
      t.assert.strictEqual(toBase32hex(uint8, { padding: false }), base32hex)
      t.assert.strictEqual(toBase32hex(uint8, { padding: true }), base32hexPadded)
    }
  })
})

const INVALID_FROM_TYPES = [null, undefined, [], [1, 2], ['00'], new Uint8Array()]
const INVALID_FROM_LAX = ['AB======'] // non-strict
const INVALID_FROM_SPACES = [' ', 'aaaa aaaa', 'aaaa aaa', 'AE====== ', 'ae ======'] // spaces
const INVALID_FROM_LENGTH = [
  ...['a', 'aaa', 'AAAAAA'],
  ...['a=', 'a==', 'a===', 'a====', 'a=====', 'a======', 'a=======', 'a========'],
  ...['aaa=', 'aaa==', 'aaa===', 'aaa====', 'aaa=====', 'aaa======', 'aaa=======', 'aaa======='],
]

const INVALID_FROM_PADDING = [
  ...['=', '==', '===', '====', '=====', '======', '=======', '========', '========='],
  ...['aa=', 'aa===', 'aa===', 'AA====', 'AA=====', 'AA======='],
  ...['aaaa=', 'aaaa==', 'aaaa==='],
  ...['a=aa', 'aa=a', '=aaa', 'aa==a', 'aaa=a', 'aa==aaaa', 'aaa=aaaa'], // symbols after =
]

const INVALID_FROM_CONTENT = [
  ...['########', '@@@@@@@@', 'aa######', 'aa%aaaa', 'aa!aaaaa'], // wrong chars
  ...['✖✖✖✖✖✖✖✖', '✖✖✖✖✖✖✖=', '✖✖✖✖✖===', '✖✖✖✖✖===', '✖✖======'], // wrong chars
  ...['✖✖✖✖✖✖==', '✖✖✖=====', '✖======='], // wrong chars and padding
  ...['x0', 'xxxx0000'], // mixed base32/base32hex
]

describe('fromBase32', () => {
  test('invalid input, coherence check', (t) => {
    for (const input of [
      ...INVALID_FROM_TYPES,
      // but not INVALID_FROM_LAX
      ...INVALID_FROM_SPACES,
      // but not INVALID_FROM_LENGTH
      // but not INVALID_FROM_PADDING
      ...INVALID_FROM_CONTENT,
    ]) {
      t.assert.throws(() => hiBase32.decode.asBytes(input.toUpperCase()))
    }
  })

  test('invalid input', (t) => {
    for (const input of [
      ...INVALID_FROM_TYPES,
      ...INVALID_FROM_LAX, // it's lax in both alphabets
      ...INVALID_FROM_SPACES,
      ...INVALID_FROM_LENGTH,
      ...INVALID_FROM_PADDING,
      ...INVALID_FROM_CONTENT,
    ]) {
      t.assert.throws(() => fromBase32(input))
      t.assert.throws(() => fromBase32hex(input))
      t.assert.throws(() => fromBase32(input.toUpperCase()))
      t.assert.throws(() => fromBase32hex(input.toUpperCase()))
      t.assert.throws(() => fromBase32(input.toLowerCase()))
      t.assert.throws(() => fromBase32hex(input.toLowerCase()))
      for (const format of ['uint8', 'buffer', 'hex']) {
        t.assert.throws(() => fromBase32(input, { format }))
        t.assert.throws(() => fromBase32hex(input, { format }))
      }
    }
  })

  test('uint8', (t) => {
    for (const { base32, base32padded, base32hex, base32hexPadded, uint8 } of pool) {
      t.assert.deepStrictEqual(fromBase32(base32), uint8)
      t.assert.deepStrictEqual(fromBase32(base32, { format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBase32(base32padded, { format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBase32(base32, { padding: false }), uint8)
      t.assert.deepStrictEqual(fromBase32(base32padded, { padding: true }), uint8)
      t.assert.deepStrictEqual(fromBase32(base32, { padding: 'both' }), uint8)
      t.assert.deepStrictEqual(fromBase32(base32padded, { padding: 'both' }), uint8)
      if (base32 !== base32padded) {
        t.assert.throws(() => fromBase32(base32, { padding: true }))
        t.assert.throws(() => fromBase32(base32padded, { padding: false }))
      }

      t.assert.deepStrictEqual(fromBase32hex(base32hex), uint8)
      t.assert.deepStrictEqual(fromBase32hex(base32hex, { format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBase32hex(base32hex, { padding: false }), uint8)
      t.assert.deepStrictEqual(fromBase32hex(base32hexPadded, { padding: true }), uint8)
      t.assert.deepStrictEqual(fromBase32hex(base32hex, { padding: 'both' }), uint8)
      t.assert.deepStrictEqual(fromBase32hex(base32hexPadded, { padding: 'both' }), uint8)
      if (base32hex !== base32hexPadded) {
        t.assert.throws(() => fromBase32hex(base32hex, { padding: true }))
        t.assert.throws(() => fromBase32hex(base32hexPadded, { padding: false }))
      }
    }
  })

  test('buffer', (t) => {
    for (const { base32, base32hex, buffer } of pool) {
      t.assert.deepStrictEqual(fromBase32(base32, { format: 'buffer' }), buffer)
      t.assert.deepStrictEqual(fromBase32hex(base32hex, { format: 'buffer' }), buffer)
    }
  })
})
