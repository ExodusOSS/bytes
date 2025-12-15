import { test, describe } from 'node:test'
import { fromHex, toHex } from '@exodus/bytes/hex.js'
import { utf16fromString, utf16toString, utf16toStringLoose } from '@exodus/bytes/utf16.js'
import { utf8fromString, utf8toString, utf8toStringLoose } from '@exodus/bytes/utf8.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { unfinishedBytes } from '../fallback/encoding.util.js'
import unfinishedBytesFixtures from './fixtures/text-encoding.unfinishedBytes.js'

const replacementChar = '\uFFFD'

const seed = randomValues(300) // small seed is fine, let's have more tests instead
const pool = [
  new Uint8Array(0),
  new Uint8Array(1),
  new Uint8Array(256),
  new Uint8Array(256).fill(1),
  new Uint8Array(256).fill(42),
  new Uint8Array(256).fill(0xd0),
  new Uint8Array(256).fill(255),
  Uint8Array.of(0xef, 0xbb, 0xbf), // BOM
  seed.subarray(1, -1),
  seed.subarray(2, -2),
  seed.subarray(3, -3),
  fromHex('61006200ffdf77007800'),
  fromHex('d800d800'),
  fromHex('00d800d8'),
  fromHex('dfffd800'),
  fromHex('ffdf00d8'),
  ...unfinishedBytesFixtures.map((x) => x[2]),
]

for (let i = 0; i < 1000; i++) {
  pool.push(seed.subarray(Math.floor(Math.random() * seed.length)).map((x, j) => x + i * j))
}

// Expand pool x3 with valid strings in encodings + save valid representations
const poolUtf8 = []
const poolUtf16le = []
const poolUtf16be = []
for (const x of pool) {
  const s = utf8toStringLoose(x)
  poolUtf8.push(utf8fromString(s))
  poolUtf16le.push(utf16fromString(s, 'uint8-le'))
  poolUtf16be.push(utf16fromString(s, 'uint8-be'))
}

pool.push(...poolUtf8, ...poolUtf16le, ...poolUtf16be)
if (pool.length !== poolUtf8.length * 4) throw new Error('Unexpected')

// Expand pool x10 with truncated
for (const x of [...pool]) {
  for (let i = 0; i < 10 && i < x.length; i++) {
    pool.push(x.subarray(0, -i))
  }
}

function concat([a, b]) {
  const x = new Uint8Array(a.length + b.length)
  x.set(a)
  x.set(b, a.length)
  return x
}

describe('unfinishedBytes', () => {
  test('fixtures', (t) => {
    for (const [enc, ex, u8] of unfinishedBytesFixtures) {
      t.assert.strictEqual(
        unfinishedBytes(u8, u8.length, enc),
        ex,
        `(0x${toHex(u8)}, ${enc}) === ${ex}`
      )
    }
  })

  test('utf-8', (t) => {
    for (const u8 of pool) {
      const x = unfinishedBytes(u8, u8.length, 'utf-8')
      t.assert.ok(x >= 0 && x <= 3 && x <= u8.byteLength)
      t.assert.doesNotThrow(() => utf8toStringLoose(u8.subarray(0, u8.byteLength - x)))
      if (x > 0) {
        const trail = u8.subarray(u8.byteLength - x)
        t.assert.ok(trail[0] >= 0xc2 && trail[0] <= 0xf4, `0x${toHex(trail)}`) // first is a lead
        t.assert.throws(() => utf8toString(trail))
        t.assert.strictEqual(utf8toStringLoose(trail), replacementChar)
        const clo = utf8toStringLoose(concat([trail, Uint8Array.of(0x80)]))
        const chi = utf8toStringLoose(concat([trail, Uint8Array.of(0xbf)]))
        t.assert.ok([...clo].length === 1 || [...chi].length === 1) // test that it can be continued into a single code point
      }
    }
  })

  test('utf-16le', (t) => {
    for (const u8 of pool) {
      const x = unfinishedBytes(u8, u8.length, 'utf-16le')
      t.assert.ok(x >= 0 && x <= 3 && x <= u8.byteLength)
      t.assert.strictEqual(x % 2, u8.byteLength % 2)
      t.assert.doesNotThrow(() => utf16toStringLoose(u8.subarray(0, u8.byteLength - x), 'uint8-le'))
      if (x > 1) {
        const trail = u8.subarray(u8.byteLength - x, u8.byteLength - (u8.byteLength % 2))
        t.assert.strictEqual(trail.byteLength, 2)
        t.assert.throws(() => utf16toString(trail, 'uint8-le'))
        t.assert.strictEqual(utf16toStringLoose(trail, 'uint8-le'), replacementChar)
        const clo1 = utf16toStringLoose(concat([trail, Uint8Array.of(0xff, 0xdb)]), 'uint8-le')
        const clo0 = utf16toStringLoose(concat([trail, Uint8Array.of(0x00, 0xdc)]), 'uint8-le')
        const chi0 = utf16toStringLoose(concat([trail, Uint8Array.of(0xff, 0xdf)]), 'uint8-le')
        const chi1 = utf16toStringLoose(concat([trail, Uint8Array.of(0x00, 0xc0)]), 'uint8-le')
        t.assert.equal([...clo1].length, 2)
        t.assert.equal([...clo0].length, 1)
        t.assert.equal([...chi0].length, 1)
        t.assert.equal([...chi1].length, 2)
      }
    }
  })

  test('utf-16be', (t) => {
    for (const u8 of pool) {
      const x = unfinishedBytes(u8, u8.length, 'utf-16be')
      t.assert.ok(x >= 0 && x <= 3 && x <= u8.byteLength)
      t.assert.strictEqual(x % 2, u8.byteLength % 2)
      t.assert.doesNotThrow(() => utf16toStringLoose(u8.subarray(0, u8.byteLength - x), 'uint8-be'))
      if (x > 1) {
        const trail = u8.subarray(u8.byteLength - x, u8.byteLength - (u8.byteLength % 2))
        t.assert.strictEqual(trail.byteLength, 2)
        t.assert.throws(() => utf16toString(trail, 'uint8-be'))
        t.assert.strictEqual(utf16toStringLoose(trail, 'uint8-be'), replacementChar)
        const clo1 = utf16toStringLoose(concat([trail, Uint8Array.of(0xdb, 0xff)]), 'uint8-le')
        const clo0 = utf16toStringLoose(concat([trail, Uint8Array.of(0xdc, 0x00)]), 'uint8-be')
        const chi0 = utf16toStringLoose(concat([trail, Uint8Array.of(0xdf, 0xff)]), 'uint8-be')
        const chi1 = utf16toStringLoose(concat([trail, Uint8Array.of(0xc0, 0x00)]), 'uint8-le')
        t.assert.equal([...clo1].length, 2)
        t.assert.equal([...clo0].length, 1)
        t.assert.equal([...chi0].length, 1)
        t.assert.equal([...chi1].length, 2)
      }
    }
  })

  describe('can iterate over valid data', () => {
    // Strict, as iterating over valid data
    const encodings = [
      ['utf-8', poolUtf8, utf8toString],
      ['utf-16le', poolUtf16le, (x) => utf16toString(x, 'uint8-le')],
      ['utf-16be', poolUtf16be, (x) => utf16toString(x, 'uint8-be')],
    ]

    for (const [encoding, localPool, toString] of encodings) {
      test(encoding, (t) => {
        for (const u8 of localPool) {
          t.assert.strictEqual(unfinishedBytes(u8, u8.length, encoding), 0)
          const str = toString(u8)
          let end = ''
          let at = 0
          for (let i = 0; i < 10 && at < u8.length; i++) {
            t.assert.strictEqual(str, toString(u8.subarray(0, u8.length - at)) + end)
            const prev = at
            at += 1 + unfinishedBytes(u8, u8.length - at - 1, encoding)
            end = toString(u8.subarray(u8.length - at, u8.length - prev)) + end
          }

          t.assert.strictEqual(str, toString(u8.subarray(0, u8.length - at)) + end)
        }
      })
    }
  })
})
