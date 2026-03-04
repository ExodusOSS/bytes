import { fromBigInt, toBigInt } from '@exodus/bytes/bigint.js'
import { describe, test } from 'node:test'

const SharedArrayBuffer = globalThis.SharedArrayBuffer ?? ArrayBuffer

const raw = [new Uint8Array(), new Uint8Array([0]), new Uint8Array([1]), new Uint8Array([255])]
for (let i = 0; i < 50; i++) {
  const size = Math.floor(Math.random() * 100)
  raw.push(crypto.getRandomValues(new Uint8Array(size)))
}

const pool = raw.map((uint8) => {
  const buffer = Buffer.from(uint8)
  const shared = new Uint8Array(new SharedArrayBuffer(uint8.length))
  shared.set(uint8)
  const ab = uint8.buffer
  if (ab.byteLength !== uint8.byteLength) throw new Error('Unexpected pooled Uint8Array')
  return { uint8, ab, shared, buffer, big: BigInt(`0x${buffer.toString('hex') || '0'}`) }
})

const VALID = [
  [0n, Uint8Array.of()],
  [0n, Uint8Array.of(0)],
  [0n, Uint8Array.of(0, 0, 0, 0, 0)],
  [0n, Uint8Array.of(0, 0, 0, 0, 0, 0, 0, 0)], // 64
  [0xaan, Uint8Array.of(0xaa)],
  [0xaan, Uint8Array.of(0, 0xaa)],
  [0xaan, Uint8Array.of(0, 0, 0xaa)],
  [0xa_aan, Uint8Array.of(0x0a, 0xaa)],
  [0xaa_aan, Uint8Array.of(0xaa, 0xaa)],
  [0xa1_b2n, Uint8Array.of(0xa1, 0xb2)],
  [0xa1_b2n, Uint8Array.of(0, 0xa1, 0xb2)],
  [0xab_cd_efn, Uint8Array.of(0xab, 0xcd, 0xef)],
  [0xaa_bb_cc_dd_ee_ffn, Uint8Array.of(0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff)],
  [0x1_23_45_67_89_ab_cd_efn, Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef)], // 64
]

const types = [Buffer, Uint8Array]

describe('toBigInt', () => {
  test('invalid input', (t) => {
    for (const input of [null, undefined, [], [1, 2], 'string']) {
      t.assert.throws(() => toBigInt(input))
    }
  })

  test('fixtures', (t) => {
    for (const [big, uint8] of VALID) {
      t.assert.strictEqual(toBigInt(uint8), big, 'uint8')
      for (const A of types) {
        t.assert.ok(Number.isSafeInteger(A.BYTES_PER_ELEMENT) && A.BYTES_PER_ELEMENT >= 1)
        if (uint8.byteLength % A.BYTES_PER_ELEMENT !== 0) continue
        const x = new A(uint8.buffer, uint8.byteOffset, uint8.byteLength / A.BYTES_PER_ELEMENT)
        t.assert.strictEqual(toBigInt(x), big, A.name)
      }
    }
  })

  test('random', (t) => {
    for (const { big, shared, uint8, buffer } of pool) {
      t.assert.strictEqual(toBigInt(uint8), big)
      t.assert.strictEqual(toBigInt(shared), big)
      t.assert.strictEqual(toBigInt(buffer), big)
    }
  })
})

describe('fromBigInt', () => {
  test('length and format', (t) => {
    t.assert.throws(() => fromBigInt(0n))
    t.assert.throws(() => fromBigInt(0n, { format: 'uint8' }))
    t.assert.throws(() => fromBigInt(0n, { format: 'arraybuffer' }))
    t.assert.throws(() => fromBigInt(0n, { format: 'buffer' }))

    for (const l of [1, 2, 3, 10, 20, 100, 1025]) {
      t.assert.deepStrictEqual(fromBigInt(0n, { length: l }), new Uint8Array(l))
      t.assert.deepStrictEqual(fromBigInt(0n, { length: l, format: 'uint8' }), new Uint8Array(l))
      t.assert.deepStrictEqual(
        fromBigInt(0n, { length: l, format: 'arraybuffer' }),
        new ArrayBuffer(l)
      )
      t.assert.deepStrictEqual(fromBigInt(0n, { length: l, format: 'buffer' }), Buffer.alloc(l))
    }

    t.assert.throws(() => fromBigInt(0n, { length: 1, format: 'invalid' }))
    t.assert.throws(() => fromBigInt(0n, { length: 2, format: 'invalid' }))

    for (const length of [0, null, undefined, '', '0', '1']) {
      t.assert.throws(() => fromBigInt(0n, { length }))
      t.assert.throws(() => fromBigInt(0n, { length, format: 'uint8' }))
      t.assert.throws(() => fromBigInt(0n, { length, format: 'arraybuffer' }))
      t.assert.throws(() => fromBigInt(0n, { length, format: 'buffer' }))
    }
  })

  test('invalid input', (t) => {
    for (const input of [null, undefined, 0, 1, Infinity, '1', '0n', -1n]) {
      t.assert.throws(() => fromBigInt(input))
      t.assert.throws(() => fromBigInt(input, { length: 1 }))
      t.assert.throws(() => fromBigInt(input, { length: 10 }))
      for (const format of ['uint8', 'arraybuffer', 'buffer', 'hex']) {
        t.assert.throws(() => fromBigInt(input, { format }))
        t.assert.throws(() => fromBigInt(input, { length: 1, format }))
        t.assert.throws(() => fromBigInt(input, { length: 10, format }))
      }
    }
  })

  test('fixtures', (t) => {
    for (const [big, uint8] of VALID) {
      const length = uint8.length
      if (length === 0) continue
      t.assert.deepStrictEqual(fromBigInt(big, { length }), uint8)
      t.assert.deepStrictEqual(fromBigInt(big, { length, format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBigInt(big, { length, format: 'arraybuffer' }), uint8.buffer)
      t.assert.deepStrictEqual(fromBigInt(big, { length, format: 'buffer' }), Buffer.from(uint8))
      if (uint8[0] > 0) {
        t.assert.throws(() => fromBigInt(big, { length: length - 1 }))
      } else if (length > 1) {
        t.assert.deepStrictEqual(fromBigInt(big, { length: length - 1 }), uint8.subarray(1))
      }
    }
  })

  test('random', (t) => {
    for (const { big, uint8, ab, buffer } of pool) {
      const length = uint8.length
      if (length === 0) continue
      t.assert.deepStrictEqual(fromBigInt(big, { length }), uint8)
      t.assert.deepStrictEqual(fromBigInt(big, { length, format: 'uint8' }), uint8)
      t.assert.deepStrictEqual(fromBigInt(big, { length, format: 'arraybuffer' }), ab)
      t.assert.deepStrictEqual(fromBigInt(big, { length, format: 'buffer' }), buffer)
      if (uint8[0] > 0) {
        t.assert.throws(() => fromBigInt(big, { length: length - 1 }))
      } else if (length > 1) {
        t.assert.deepStrictEqual(fromBigInt(big, { length: length - 1 }), uint8.subarray(1))
      }
    }
  })
})
