import { fromBech32, fromBech32m, toBech32, toBech32m } from '@exodus/bytes/bech32.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { test } from 'node:test'
import bech32 from 'bech32'

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

test('fromBech32 matches bech32, static data', (t) => {
  for (let size = 0; size <= maxBytes; size++) {
    const zeros = new Uint8Array(size)
    const ones = new Uint8Array(size).fill(1)
    const mid = new Uint8Array(size).fill(42)
    const max = new Uint8Array(size).fill(255)
    for (const p of ['bc', 'whatever']) {
      t.assert.strictEqual(toBech32(p, zeros), alt.toBech32(p, zeros), `[0] x${size}, ${p}`)
      t.assert.strictEqual(toBech32m(p, zeros), alt.toBech32m(p, zeros), `[0] x${size}, ${p}`)
      t.assert.strictEqual(toBech32(p, ones), alt.toBech32(p, ones), `[1] x${size}, ${p}`)
      t.assert.strictEqual(toBech32m(p, ones), alt.toBech32m(p, ones), `[1] x${size}, ${p}`)
      t.assert.strictEqual(toBech32(p, mid), alt.toBech32(p, mid), `[42] x${size}, ${p}`)
      t.assert.strictEqual(toBech32m(p, mid), alt.toBech32m(p, mid), `[42] x${size}, ${p}`)
      t.assert.strictEqual(toBech32(p, max), alt.toBech32(p, max), `[255] x${size}, ${p}`)
      t.assert.strictEqual(toBech32m(p, max), alt.toBech32m(p, max), `[255] x${size}, ${p}`)
    }
  }
})

test('sizes roundtrip, static data', (t) => {
  for (let size = 0; size < 47; size++) {
    const zeros = new Uint8Array(size)
    const ones = new Uint8Array(size).fill(1)
    const mid = new Uint8Array(size).fill(42)
    const max = new Uint8Array(size).fill(255)
    for (const p of ['bc', 'whatever']) {
      t.assert.deepStrictEqual(round(p, zeros), { prefix: p, bytes: zeros }, `[0] x${size}, ${p}`)
      t.assert.deepStrictEqual(roundM(p, zeros), { prefix: p, bytes: zeros }, `[0] x${size}, ${p}`)
      t.assert.deepStrictEqual(round(p, ones), { prefix: p, bytes: ones }, `[1] x${size}, ${p}`)
      t.assert.deepStrictEqual(roundM(p, ones), { prefix: p, bytes: ones }, `[1] x${size}, ${p}`)
      t.assert.deepStrictEqual(round(p, mid), { prefix: p, bytes: mid }, `[42] x${size}, ${p}`)
      t.assert.deepStrictEqual(roundM(p, mid), { prefix: p, bytes: mid }, `[42] x${size}, ${p}`)
      t.assert.deepStrictEqual(round(p, max), { prefix: p, bytes: max }, `[255] x${size}, ${p}`)
      t.assert.deepStrictEqual(roundM(p, max), { prefix: p, bytes: max }, `[255] x${size}, ${p}`)
    }
  }
})

test('toBech32 matches bech32, random data', (t) => {
  const seed = randomValues(1024)

  for (let size = 1; size <= maxBytes; size++) {
    for (const p of ['bc', 'whatever']) {
      for (let start = 0, i = 0; start < seed.length - size && i < 100; start++, i++) {
        const bytes = seed.subarray(start, start + size)
        t.assert.strictEqual(toBech32(p, bytes), alt.toBech32(p, bytes), `random x${size}, ${p}`)
        t.assert.strictEqual(toBech32m(p, bytes), alt.toBech32m(p, bytes), `random x${size}, ${p}`)
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
        t.assert.deepStrictEqual(round(p, bytes), { prefix: p, bytes }, `random x${size}`)
        t.assert.deepStrictEqual(roundM(p, bytes), { prefix: p, bytes }, `random x${size}`)
      }
    }
  }
})
