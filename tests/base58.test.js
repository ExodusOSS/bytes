import { fromBase58, toBase58, fromBase58xrp, toBase58xrp } from '@exodus/bytes/base58.js'
import { fromHex } from '@exodus/bytes/hex.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { hashSync } from '@exodus/crypto/hash' // eslint-disable-line @exodus/import/no-deprecated
import { describe, test } from 'node:test'
import bs58 from 'bs58'
import xAddressCodecFixtures from './vendor/x-address-codec/fixtures/base58.cjs'

// https://en.bitcoin.it/wiki/Base58Check_encoding#Creating_a_Base58Check_string
const toChecked = (version, pub) => {
  const data = [Uint8Array.of(version), pub]
  // eslint-disable-next-line @exodus/import/no-deprecated
  const hashed = hashSync('sha256', hashSync('sha256', data, 'uint8'), 'uint8')
  return Uint8Array.from(Buffer.concat([...data, hashed.subarray(0, 4)]))
}

describe('static vectors', () => {
  test('base58', (t) => {
    const fixtures = [
      ['skip', fromHex('971a55')], // https://github.com/bitcoin/bitcoin/blob/13891a8a68/src/test/base58_tests.cpp
    ]

    for (const [string, u8] of fixtures) {
      t.assert.deepStrictEqual(fromBase58(string), u8, string)
      t.assert.strictEqual(toBase58(u8), string)
    }
  })

  test('base58xrp', (t) => {
    const fixtures = [
      // https://xrpl.org/docs/tutorials/how-tos/use-specialized-payment-types/use-payment-channels#example-values
      [
        'aB44YfzW24VDEJQ2UuLPV2PvqcPCSoLnL7y5M1EzhdW4LnK5xMS3',
        toChecked(
          0x23, // https://xrpl.org/docs/references/protocol/data-types/base58-encodings
          fromHex('023693F15967AE357D0327974AD46FE3C127113B1110D6044FD41E723689F81CC6')
        ),
      ],
    ]

    for (const [string, u8] of fixtures) {
      t.assert.deepStrictEqual(fromBase58xrp(string), u8, string)
      t.assert.strictEqual(toBase58xrp(u8), string)
    }
  })
})

describe('x-address-codec fixtures', () => {
  test('base58', (t) => {
    for (const { hex, string } of xAddressCodecFixtures.bitcoin) {
      const u8 = fromHex(hex)
      t.assert.strictEqual(toBase58(u8), string)
      t.assert.deepStrictEqual(fromBase58(string), u8, string)
    }
  })

  test('base58xrp', (t) => {
    for (const { hex, string } of xAddressCodecFixtures.ripple) {
      const u8 = fromHex(hex)
      t.assert.strictEqual(toBase58xrp(u8), string)
      t.assert.deepStrictEqual(fromBase58xrp(string), u8, string)
    }
  })

  test('invalid', (t) => {
    for (const { description, string } of xAddressCodecFixtures.invalid) {
      t.assert.throws(() => fromBase58(string), description)
      t.assert.throws(() => fromBase58xrp(string), description)
    }
  })
})

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
