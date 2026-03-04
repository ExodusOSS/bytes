import { fromBase58checkSync as fromBase58c, toBase58checkSync } from '@exodus/bytes/base58check.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { test } from 'node:test'
import bs58check from 'bs58check'

const SharedArrayBuffer = globalThis.SharedArrayBuffer ?? ArrayBuffer
const toShared = (u8) => {
  const res = new Uint8Array(new SharedArrayBuffer(u8.length))
  res.set(u8)
  return res
}

const tracked = []

function fromBase58checkSync(...args) {
  const res = fromBase58c(...args)
  tracked.push(res)
  return res
}

test('zeros', (t) => {
  for (let size = 0; size <= 1024; size++) {
    const zeros = new Uint8Array(size)
    const encoded = toBase58checkSync(zeros)
    t.assert.strictEqual(toBase58checkSync(toShared(zeros)), encoded, `[0] x${size} shared`)
    t.assert.strictEqual(bs58check.encode(zeros), encoded, `[0] x${size} bs58check.encode`) // matches bs58check
    t.assert.deepStrictEqual(fromBase58checkSync(encoded), zeros, `[0] x${size} fromBase58check`)
  }
})

test('toBase58checkSync matches bs58check, static data', (t) => {
  for (let size = 0; size < 180; size++) {
    const zeros = new Uint8Array(size)
    t.assert.strictEqual(toBase58checkSync(zeros), bs58check.encode(zeros), `[0] x${size}`)
    const ones = new Uint8Array(size).fill(1)
    t.assert.strictEqual(toBase58checkSync(ones), bs58check.encode(ones), `[1] x${size}`)
    const mid = new Uint8Array(size).fill(42)
    t.assert.strictEqual(toBase58checkSync(mid), bs58check.encode(mid), `[42] x${size}`)
    const max = new Uint8Array(size).fill(255)
    t.assert.strictEqual(toBase58checkSync(max), bs58check.encode(max), `[255] x${size}`)
  }
})

test('sizes roundtrip, static data + types', (t) => {
  for (let size = 0; size < 260; size++) {
    const zeros = new Uint8Array(size)
    const zerosBase58check = toBase58checkSync(zeros)
    t.assert.deepStrictEqual(fromBase58checkSync(zerosBase58check), zeros, `[0] x${size}`)
    t.assert.deepStrictEqual(fromBase58checkSync(zerosBase58check, 'buffer'), Buffer.from(zeros))
    t.assert.deepStrictEqual(fromBase58checkSync(zerosBase58check, 'arraybuffer'), zeros.buffer)
    const ones = new Uint8Array(size).fill(1)
    const onesBase58check = toBase58checkSync(ones)
    t.assert.deepStrictEqual(fromBase58checkSync(onesBase58check), ones, `[1] x${size}`)
    t.assert.deepStrictEqual(fromBase58checkSync(onesBase58check, 'buffer'), Buffer.from(ones))
    t.assert.deepStrictEqual(fromBase58checkSync(onesBase58check, 'arraybuffer'), ones.buffer)
    const mid = new Uint8Array(size).fill(42)
    const midBase58check = toBase58checkSync(mid)
    t.assert.deepStrictEqual(fromBase58checkSync(midBase58check), mid, `[42] x${size}`)
    t.assert.deepStrictEqual(fromBase58checkSync(midBase58check, 'buffer'), Buffer.from(mid))
    t.assert.deepStrictEqual(fromBase58checkSync(midBase58check, 'arraybuffer'), mid.buffer)
    const max = new Uint8Array(size).fill(255)
    const maxBase58check = toBase58checkSync(max)
    t.assert.deepStrictEqual(fromBase58checkSync(maxBase58check), max, `[255] x${size}`)
    t.assert.deepStrictEqual(fromBase58checkSync(maxBase58check, 'buffer'), Buffer.from(max))
    t.assert.deepStrictEqual(fromBase58checkSync(maxBase58check, 'arraybuffer'), max.buffer)
  }
})

test('toBase58checkSync matches bs58check, random data', (t) => {
  const seed = randomValues(260)

  // more samples for small sizes
  for (let size = 1; size < 100; size++) {
    const samples = size < 60 ? 100 : 10
    for (let start = 0, i = 0; start < seed.length - size && i < samples; start++, i++) {
      const arr = seed.subarray(start, start + size)
      t.assert.strictEqual(toBase58checkSync(arr), bs58check.encode(arr), `random x${size}`)
    }
  }

  // and one sample for all sizes in range
  for (let size = 0; size < seed.length; size++) {
    const arr = seed.subarray(seed.length - size)
    t.assert.strictEqual(toBase58checkSync(arr), bs58check.encode(arr), `random x${size}`)
  }
})

test('sizes roundtrip, random data', (t) => {
  const seed = randomValues(300)

  // more samples for small sizes
  for (let size = 1; size < 100; size++) {
    const samples = size < 60 ? 100 : 10
    for (let start = 0, i = 0; start < seed.length - size && i < samples; start++, i++) {
      const arr = seed.subarray(start, start + size)
      t.assert.deepStrictEqual(fromBase58checkSync(toBase58checkSync(arr)), arr, `random x${size}`)
    }
  }

  // and one sample for all sizes in range
  for (let size = 0; size < seed.length; size++) {
    const arr = seed.subarray(seed.length - size)
    t.assert.deepStrictEqual(fromBase58checkSync(toBase58checkSync(arr)), arr, `random x${size}`)
  }
})

test('fromBase58check returns non-pooled Uint8Array instances', (t) => {
  t.assert.ok(tracked.length > 1000)

  for (const u8 of tracked) {
    if (Buffer.isBuffer(u8) || u8 instanceof ArrayBuffer) continue
    t.assert.strictEqual(u8.byteLength, u8.buffer.byteLength)
  }
})
