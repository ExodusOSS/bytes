import { toHex, fromHex } from '@exodus/bytes/hex.js'
import * as js from '../fallback/hex.js'
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

const INVALID = [
  // Wrong type
  null,
  undefined,
  [],
  [1, 2],
  ['00'],
  new Uint8Array(),
  // Wrong chars
  'ag',
  'a!',
  'aa!',
  // Even
  'a',
  '000',
  // Prefixes
  '0x00',
  '0x',
  // Spaces anywhere
  '00 00',
  ' 1234',
  '  ',
  '\t\t',
  '4321 ',
  ' 00\n00',
]

const VALID = [
  ['', Uint8Array.of()],
  ['00', Uint8Array.of(0)],
  ['0000000000', Uint8Array.of(0, 0, 0, 0, 0)],
  ['0000000000000000', Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0)], // 64
  ['aa', Uint8Array.of(0xaa)],
  ['AA', Uint8Array.of(0xaa)],
  ['aAAa', Uint8Array.of(0xaa, 0xaa)],
  ['a1B2', Uint8Array.of(0xa1, 0xb2)],
  ['AbcDef', Uint8Array.of(0xab, 0xcd, 0xef)],
  ['aAbBcCdDeEfF', Uint8Array.of(0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff)],
  ['0123456789abcdef', Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef)], // 64
  ['0123456789aBCdeF', Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef)], // 64
]

const types = [Buffer, Uint8Array]

describe('toHex', () => {
  test('invalid input', (t) => {
    for (const input of [null, undefined, [], [1, 2], 'string']) {
      t.assert.throws(() => toHex(input))
      t.assert.throws(() => js.toHex(input))
    }
  })

  test('fixtures', (t) => {
    for (const [hex, uint8] of VALID) {
      t.assert.strictEqual(toHex(uint8), hex.toLowerCase(), 'uint8')
      for (const A of types) {
        t.assert.ok(Number.isSafeInteger(A.BYTES_PER_ELEMENT) && A.BYTES_PER_ELEMENT >= 1)
        if (uint8.byteLength % A.BYTES_PER_ELEMENT !== 0) continue
        const x = new A(uint8.buffer, uint8.byteOffset, uint8.byteLength / A.BYTES_PER_ELEMENT)
        t.assert.strictEqual(toHex(x), hex.toLowerCase(), A.name)
        t.assert.strictEqual(js.toHex(x), hex.toLowerCase(), A.name)
      }
    }
  })

  test('random', (t) => {
    for (const { uint8, buffer, hex } of pool) {
      t.assert.strictEqual(toHex(uint8), hex)
      t.assert.strictEqual(toHex(buffer), hex)
      t.assert.strictEqual(js.toHex(uint8), hex)
    }
  })
})

describe('fromHex', () => {
  test('invalid input', (t) => {
    for (const input of INVALID) {
      if (Uint8Array.fromHex) t.assert.throws(() => Uint8Array.fromHex(input), 'coherence')
      t.assert.throws(() => fromHex(input))
      t.assert.throws(() => js.fromHex(input))
      for (const form of ['uint8', 'buffer', 'hex']) {
        t.assert.throws(() => fromHex(input, form))
      }
    }
  })

  test('uint8, fixtures', (t) => {
    for (const [hex, uint8] of VALID) {
      if (Uint8Array.fromHex) t.assert.deepEqual(uint8, Uint8Array.fromHex(hex), 'coherence')
      t.assert.deepStrictEqual(fromHex(hex), uint8)
      t.assert.deepStrictEqual(fromHex(hex, 'uint8'), uint8)
      t.assert.deepStrictEqual(js.fromHex(hex), uint8)
    }
  })

  test('uint8, random', (t) => {
    for (const { hex, uint8 } of pool) {
      t.assert.deepStrictEqual(fromHex(hex), uint8)
      t.assert.deepStrictEqual(fromHex(hex, 'uint8'), uint8)
      t.assert.deepStrictEqual(js.fromHex(hex), uint8)
    }
  })

  test('buffer, fixtures', (t) => {
    for (const [hex, uint8] of VALID) {
      t.assert.deepStrictEqual(Buffer.from(hex, 'hex'), Buffer.from(uint8), 'coherence')
      t.assert.deepStrictEqual(fromHex(hex, 'buffer'), Buffer.from(uint8))
    }
  })

  test('buffer, random', (t) => {
    for (const { hex, buffer } of pool) {
      t.assert.deepStrictEqual(fromHex(hex, 'buffer'), buffer)
    }
  })
})
