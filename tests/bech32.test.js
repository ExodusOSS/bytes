import { fromBech32, fromBech32m, toBech32, toBech32m } from '@exodus/bytes/bech32.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { test } from 'node:test'
import bech32 from 'bech32'

const SharedArrayBuffer = globalThis.SharedArrayBuffer ?? ArrayBuffer
const toShared = (u8) => {
  const res = new Uint8Array(new SharedArrayBuffer(u8.length))
  res.set(u8)
  return res
}

const alt = {
  toBech32: (prefix, bytes) => bech32.bech32.encode(prefix, bech32.bech32.toWords(bytes)),
  toBech32m: (prefix, bytes) => bech32.bech32m.encode(prefix, bech32.bech32m.toWords(bytes)),
  fromBech32: (str) => {
    const { prefix, words } = bech32.bech32.decode(str)
    return { prefix, bytes: Uint8Array.from(bech32.bech32.fromWords(words)) }
  },
  fromBech32m: (str) => {
    const { prefix, words } = bech32.bech32m.decode(str)
    return { prefix, bytes: Uint8Array.from(bech32.bech32m.fromWords(words)) }
  },
}

const maxBytes = 46

const round = (p, x) => fromBech32(toBech32(p, x))
const roundM = (p, x) => fromBech32m(toBech32m(p, x))

test('toBech32 matches bech32, static data', (t) => {
  const r = (p, u8, desc) => {
    const s8 = toShared(u8)
    t.assert.strictEqual(toBech32(p, u8), alt.toBech32(p, u8), desc)
    t.assert.strictEqual(toBech32m(p, u8), alt.toBech32m(p, u8), desc)
    t.assert.strictEqual(toBech32(p, s8), alt.toBech32(p, u8), desc)
    t.assert.strictEqual(toBech32m(p, s8), alt.toBech32m(p, u8), desc)
  }

  for (let size = 0; size <= maxBytes; size++) {
    const zeros = new Uint8Array(size)
    const ones = new Uint8Array(size).fill(1)
    const mid = new Uint8Array(size).fill(42)
    const max = new Uint8Array(size).fill(255)
    for (const p of ['bc', 'whatever']) {
      r(p, zeros, `[0] x${size}, ${p}`)
      r(p, ones, `[1] x${size}, ${p}`)
      r(p, mid, `[42] x${size}, ${p}`)
      r(p, max, `[255] x${size}, ${p}`)
    }
  }
})

test('sizes roundtrip, static data', (t) => {
  const r = (p, u8, desc) => {
    const s8 = toShared(u8)
    t.assert.deepStrictEqual(round(p, u8), { prefix: p, bytes: u8 }, desc)
    t.assert.deepStrictEqual(roundM(p, u8), { prefix: p, bytes: u8 }, desc)
    t.assert.deepStrictEqual(round(p, s8), { prefix: p, bytes: u8 }, desc)
    t.assert.deepStrictEqual(roundM(p, s8), { prefix: p, bytes: u8 }, desc)
  }

  for (let size = 0; size < 47; size++) {
    const zeros = new Uint8Array(size)
    const ones = new Uint8Array(size).fill(1)
    const mid = new Uint8Array(size).fill(42)
    const max = new Uint8Array(size).fill(255)
    for (const p of ['bc', 'whatever']) {
      r(p, zeros, `[0] x${size}, ${p}`)
      r(p, ones, `[1] x${size}, ${p}`)
      r(p, mid, `[42] x${size}, ${p}`)
      r(p, max, `[255] x${size}, ${p}`)
    }
  }
})

test('toBech32 matches bech32, random data', (t) => {
  const seed = randomValues(1024)

  for (let size = 1; size <= maxBytes; size++) {
    for (const p of ['bc', 'whatever']) {
      for (let start = 0, i = 0; start < seed.length - size && i < 100; start++, i++) {
        const bytes = seed.subarray(start, start + size)
        const shared = toShared(bytes)
        t.assert.strictEqual(toBech32(p, bytes), alt.toBech32(p, bytes), `random x${size}, ${p}`)
        t.assert.strictEqual(toBech32m(p, bytes), alt.toBech32m(p, bytes), `random x${size}, ${p}`)
        t.assert.strictEqual(toBech32(p, shared), alt.toBech32(p, bytes), `random x${size}, ${p}`)
        t.assert.strictEqual(toBech32m(p, shared), alt.toBech32m(p, bytes), `random x${size}, ${p}`)
      }
    }
  }
})

test('sizes roundtrip, random data', (t) => {
  const seed = randomValues(1024)

  // more samples for small sizes
  for (let size = 1; size <= maxBytes; size++) {
    for (const p of ['bc', 'whatever']) {
      for (let start = 0, i = 0; start < seed.length - size && i < 100; start++, i++) {
        const bytes = seed.subarray(start, start + size)
        const shared = toShared(bytes)
        t.assert.deepStrictEqual(round(p, bytes), { prefix: p, bytes }, `random x${size}`)
        t.assert.deepStrictEqual(roundM(p, bytes), { prefix: p, bytes }, `random x${size}`)
        t.assert.deepStrictEqual(round(p, shared), { prefix: p, bytes }, `random x${size}`)
        t.assert.deepStrictEqual(roundM(p, shared), { prefix: p, bytes }, `random x${size}`)
      }
    }
  }
})

test('fromBech32 does not accept non-Latin1 chars', (t) => {
  t.assert.deepStrictEqual(fromBech32('b19gzdzt2z'), { prefix: 'b', bytes: Uint8Array.of(42) })
  t.assert.deepStrictEqual(fromBech32m('c19v6eekez'), { prefix: 'c', bytes: Uint8Array.of(43) })
  t.assert.throws(() => fromBech32('\u106219gzdzt2z'), /Missing or invalid prefix/)
  t.assert.throws(() => fromBech32m('\u206319gzdzt2z'), /Missing or invalid prefix/)
  t.assert.throws(() => fromBech32('b19gzd\u107At2z'), /Non-bech32 character/)
  t.assert.throws(() => fromBech32m('c19gzd\u207At2z'), /Non-bech32 character/)
})
