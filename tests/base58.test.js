import { fromBase58, toBase58 } from '@exodus/bytes/base58.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { test } from 'node:test'
import bs58 from 'bs58'

test('zeros', (t) => {
  for (let size = 0; size <= 1024; size++) {
    const zeros = new Uint8Array(size)
    const expected = '1'.repeat(size)
    t.assert.strictEqual(toBase58(zeros), expected, `[0] x${size} toBase58`)
    t.assert.strictEqual(bs58.encode(zeros), expected, `[0] x${size} bs58.encode`) // matches bs58
    t.assert.deepStrictEqual(fromBase58(expected), zeros, `[0] x${size} fromBase58`)
  }
})

test('toBase58 matches bs58, static data', (t) => {
  for (let size = 0; size < 180; size++) {
    const zeros = new Uint8Array(size)
    t.assert.strictEqual(toBase58(zeros), bs58.encode(zeros), `[0] x${size}`)
    const ones = new Uint8Array(size).fill(1)
    t.assert.strictEqual(toBase58(ones), bs58.encode(ones), `[1] x${size}`)
    const mid = new Uint8Array(size).fill(42)
    t.assert.strictEqual(toBase58(mid), bs58.encode(mid), `[42] x${size}`)
    const max = new Uint8Array(size).fill(255)
    t.assert.strictEqual(toBase58(max), bs58.encode(max), `[255] x${size}`)
  }
})

test('toBase58 matches bs58, maximum char repeated', (t) => {
  const maxChar = 'z'
  for (let size = 0; size < 300; size++) {
    const encoded = maxChar.repeat(size)
    const decoded = fromBase58(encoded)
    t.assert.strictEqual(toBase58(decoded), encoded, `${maxChar} x${size} toBase58`)
    t.assert.strictEqual(bs58.encode(decoded), encoded, `${maxChar} x${size}`) // matches bs58
  }
})

test('sizes roundtrip, static data', (t) => {
  for (let size = 0; size < 260; size++) {
    const zeros = new Uint8Array(size)
    t.assert.deepStrictEqual(fromBase58(toBase58(zeros)), zeros, `[0] x${size}`)
    const ones = new Uint8Array(size).fill(1)
    t.assert.deepStrictEqual(fromBase58(toBase58(ones)), ones, `[1] x${size}`)
    const mid = new Uint8Array(size).fill(42)
    t.assert.deepStrictEqual(fromBase58(toBase58(mid)), mid, `[42] x${size}`)
    const max = new Uint8Array(size).fill(255)
    t.assert.deepStrictEqual(fromBase58(toBase58(max)), max, `[255] x${size}`)
  }
})

test('toBase58 matches bs58, random data', (t) => {
  const seed = randomValues(260)

  // more samples for small sizes
  for (let size = 1; size < 100; size++) {
    const samples = size < 60 ? 100 : 10
    for (let start = 0, i = 0; start < seed.length - size && i < samples; start++, i++) {
      const arr = seed.subarray(start, start + size)
      t.assert.strictEqual(toBase58(arr), bs58.encode(arr), `random x${size}`)
    }
  }

  // and one sample for all sizes in range
  for (let size = 0; size < seed.length; size++) {
    const arr = seed.subarray(seed.length - size)
    t.assert.strictEqual(toBase58(arr), bs58.encode(arr), `random x${size}`)
  }
})

test('sizes roundtrip, random data', (t) => {
  const seed = randomValues(300)

  // more samples for small sizes
  for (let size = 1; size < 100; size++) {
    const samples = size < 60 ? 100 : 10
    for (let start = 0, i = 0; start < seed.length - size && i < samples; start++, i++) {
      const arr = seed.subarray(start, start + size)
      t.assert.deepStrictEqual(fromBase58(toBase58(arr)), arr, `random x${size}`)
    }
  }

  // and one sample for all sizes in range
  for (let size = 0; size < seed.length; size++) {
    const arr = seed.subarray(seed.length - size)
    t.assert.deepStrictEqual(fromBase58(toBase58(arr)), arr, `random x${size}`)
  }
})
