import { toBase64, toBase64url, fromBase64, fromBase64url } from '@exodus/bytes/base64.js'
import * as js from '../fallback/base64.js'
import { describe, test } from 'node:test'

const raw = [new Uint8Array(), new Uint8Array([0]), new Uint8Array([1]), new Uint8Array([255])]
for (let i = 0; i < 50; i++) {
  const size = Math.floor(Math.random() * 100)
  raw.push(crypto.getRandomValues(new Uint8Array(size)))
}

const pool = raw.map((uint8) => {
  const buffer = Buffer.from(uint8)
  const base64 = buffer.toString('base64')
  const base64nopad = base64.replaceAll('=', '')
  const base64urlPadded = base64.replaceAll('+', '-').replaceAll('/', '_')
  const base64urlFallback = base64urlPadded.replaceAll('=', '')
  let base64url = base64urlFallback
  try {
    base64url = buffer.toString('base64url') // unsupported by https://npmjs.com/package/buffer
  } catch {}

  if (base64url !== base64urlFallback) throw new Error('Unexpected base64url mismatch with Buffer')
  const hex = buffer.toString('hex')
  return { uint8, buffer, hex, base64, base64nopad, base64url, base64urlPadded }
})

describe('toBase64', () => {
  describe('invalid input', () => {
    for (const method of [toBase64, toBase64url, js.toBase64]) {
      test(method.name, (t) => {
        for (const input of [null, undefined, [], [1, 2], new Uint16Array(1), 'string']) {
          t.assert.throws(() => method(input))
        }
      })
    }
  })

  test('base64', (t) => {
    for (const { uint8, buffer, base64, base64nopad } of pool) {
      t.assert.strictEqual(toBase64(uint8), base64)
      t.assert.strictEqual(toBase64(uint8, { padding: true }), base64)
      t.assert.strictEqual(toBase64(uint8, { padding: false }), base64nopad)
      t.assert.strictEqual(js.toBase64(uint8, false, false), base64nopad)
      t.assert.strictEqual(js.toBase64(uint8, false, true), base64)
      t.assert.strictEqual(toBase64(buffer), base64)
      t.assert.strictEqual(toBase64(buffer, { padding: true }), base64)
      t.assert.strictEqual(toBase64(buffer, { padding: false }), base64nopad)
      t.assert.strictEqual(js.toBase64(buffer, false, false), base64nopad)
      t.assert.strictEqual(js.toBase64(buffer, false, true), base64)
    }
  })

  test('base64url', (t) => {
    for (const { uint8, buffer, base64url, base64urlPadded } of pool) {
      t.assert.strictEqual(toBase64url(uint8), base64url)
      t.assert.strictEqual(toBase64url(uint8, { padding: false }), base64url)
      t.assert.strictEqual(toBase64url(uint8, { padding: true }), base64urlPadded)
      t.assert.strictEqual(js.toBase64(uint8, true, false), base64url)
      t.assert.strictEqual(js.toBase64(uint8, true, true), base64urlPadded)
      t.assert.strictEqual(toBase64url(buffer), base64url)
      t.assert.strictEqual(toBase64url(buffer, { padding: false }), base64url)
      t.assert.strictEqual(toBase64url(buffer, { padding: true }), base64urlPadded)
      t.assert.strictEqual(js.toBase64(buffer, true, false), base64url)
      t.assert.strictEqual(js.toBase64(buffer, true, true), base64urlPadded)
    }
  })
})

const INVALID_FROM_TYPES = [null, undefined, [], [1, 2], ['00'], new Uint8Array()]
const INVALID_FROM_LAX = ['aa=='] // non-strict
const INVALID_FROM_SPACES = [
  ...[' ', '    ', 'aaaa aaaa', 'aaaa  aaaa', 'aaaa    aaaa', 'aaaa aaa', 'aa== ', 'aa =='], // spaces
  ...['\n', '\n\n\n\n', 'aaaa\naaaa', 'aaaa\n\n\n\naaaa', 'aaaa\n', 'aaaa\n\n\n\n'], // newlines
  ...['\u00A0', '\u00A0\u00A0\u00A0\u00A0', 'aaaa\u00A0\u00A0\u00A0\u00A0aaaa'], // nbsp
]

const INVALID_FROM_PADDED = ['_aY=', '_aa=', '-a==', '-Q=='] // padded base64url
const INVALID_FROM_CONTENT = [
  ...['a', 'aaaaa'], // wrong length
  ...['=', '==', '===', '====', 'a=', 'a==', 'a===', 'a====', 'aa=', 'aa===', 'aa==='], // wrong padding
  ...['aaa==', 'aaa===', 'aaa====', 'aaaa=', 'aaaa==', 'aaaa==='], // wrong padding
  ...['####', '@@@@', 'aaa#', 'a%aa'], // wrong chars
  ...['Z−==', '✖✖✖✖'], // wrong chars
  ...['a-+a', 'aa+_', 'aa_/', '-a/a'], // mixed base64/base64url
  ...['a=aa', 'aa=a', '=aaa', 'aa==a', 'aaa=a', 'aa==aaaa', 'aaa=aaaa'], // symbols after =
]

describe('fromBase64', () => {
  if (Uint8Array.fromBase64 && !['jsc', 'webkit'].includes(process.env.EXODUS_TEST_PLATFORM)) {
    test('invalid input, coherence check', (t) => {
      for (const input of [
        ...INVALID_FROM_TYPES,
        ...INVALID_FROM_LAX,
        // but not INVALID_FROM_SPACES,
        // but not INVALID_FROM_PADDED
        ...INVALID_FROM_CONTENT,
      ]) {
        t.assert.throws(() => Uint8Array.fromBase64(input, { lastChunkHandling: 'strict' }))
        t.assert.throws(() =>
          Uint8Array.fromBase64(input, { lastChunkHandling: 'strict', alphabet: 'base64' })
        )
        t.assert.throws(() =>
          Uint8Array.fromBase64(input, { lastChunkHandling: 'strict', alphabet: 'base64url' })
        )
      }
    })
  }

  test('invalid input', (t) => {
    for (const input of [
      ...INVALID_FROM_TYPES,
      ...INVALID_FROM_LAX,
      ...INVALID_FROM_SPACES,
      ...INVALID_FROM_PADDED,
      ...INVALID_FROM_CONTENT,
    ]) {
      t.assert.throws(() => fromBase64(input))
      t.assert.throws(() => fromBase64url(input))
      for (const format of ['uint8', 'buffer', 'hex']) {
        t.assert.throws(() => fromBase64(input, { format }))
        t.assert.throws(() => fromBase64url(input, { format }))
      }
    }
  })

  test('invalid input, fallback', (t) => {
    for (const input of [...INVALID_FROM_SPACES, ...INVALID_FROM_LAX, ...INVALID_FROM_CONTENT]) {
      t.assert.throws(() => js.fromBase64(input, false), input)
      t.assert.throws(() => js.fromBase64(input, true), input)
    }
  })

  test('uint8', (t) => {
    for (const { base64, base64nopad, base64url, base64urlPadded, uint8 } of pool) {
      t.assert.deepStrictEqual(fromBase64(base64), uint8)
      t.assert.deepStrictEqual(fromBase64(base64, { format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBase64(base64nopad, { format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBase64(base64, { padding: true }), uint8)
      t.assert.deepStrictEqual(fromBase64(base64nopad, { padding: false }), uint8)
      t.assert.deepStrictEqual(fromBase64(base64, { padding: 'both' }), uint8)
      t.assert.deepStrictEqual(fromBase64(base64nopad, { padding: 'both' }), uint8)
      if (base64 !== base64nopad) {
        t.assert.throws(() => fromBase64(base64, { padding: false }))
        t.assert.throws(() => fromBase64(base64nopad, { padding: true }))
      }

      t.assert.deepStrictEqual(fromBase64url(base64url), uint8)
      t.assert.deepStrictEqual(fromBase64url(base64url, { format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBase64url(base64url, { padding: false }), uint8)
      t.assert.deepStrictEqual(fromBase64url(base64urlPadded, { padding: true }), uint8)
      t.assert.deepStrictEqual(fromBase64url(base64url, { padding: 'both' }), uint8)
      t.assert.deepStrictEqual(fromBase64url(base64urlPadded, { padding: 'both' }), uint8)
      if (base64url !== base64urlPadded) {
        t.assert.throws(() => fromBase64url(base64urlPadded, { padding: false }))
        t.assert.throws(() => fromBase64url(base64url, { padding: true }))
      }
    }
  })

  test('buffer', (t) => {
    for (const { base64, base64url, buffer } of pool) {
      t.assert.deepStrictEqual(fromBase64(base64, { format: 'buffer' }), buffer)
      t.assert.deepStrictEqual(fromBase64url(base64url, { format: 'buffer' }), buffer)
    }
  })

  test('fallback', (t) => {
    for (const { base64, base64nopad, base64url, base64urlPadded, uint8 } of pool) {
      t.assert.deepStrictEqual(js.fromBase64(base64, false), uint8)
      t.assert.deepStrictEqual(js.fromBase64(base64url, true), uint8)
      t.assert.deepStrictEqual(js.fromBase64(base64nopad, false), uint8)
      t.assert.deepStrictEqual(js.fromBase64(base64urlPadded, true), uint8)
    }
  })
})
