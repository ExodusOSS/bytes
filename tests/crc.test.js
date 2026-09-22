import { crc32 } from '@exodus/bytes/crc.js'
import * as lib from '../crc.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { describe, test } from 'node:test'

const SharedArrayBuffer = globalThis.SharedArrayBuffer ?? ArrayBuffer
const toShared = (u8, offset = 0) => {
  const res = new Uint8Array(new SharedArrayBuffer(u8.length + offset)).subarray(offset)
  res.set(u8)
  return res
}

// Bitwise reference implementation (no tables, no fast paths), for coherence checks
function crc32reference(arr) {
  let c = 0xff_ff_ff_ff
  for (let i = 0; i < arr.length; i++) {
    c ^= arr[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xed_b8_83_20 : c >>> 1
  }

  return (c ^ 0xff_ff_ff_ff) >>> 0
}

const ascii = (str) => Uint8Array.from(str, (c) => c.charCodeAt(0))

// Well-known CRC-32 test vectors, e.g. Go hash/crc32 test suite
// prettier-ignore
const STRINGS = [
  ['', 0x00_00_00_00],
  ['a', 0xe8_b7_be_43],
  ['ab', 0x9e_83_48_6d],
  ['abc', 0x35_24_41_c2],
  ['abcd', 0xed_82_cd_11],
  ['abcde', 0x85_87_d8_65],
  ['abcdef', 0x4b_8e_39_ef],
  ['abcdefg', 0x31_2a_6a_a6],
  ['abcdefgh', 0xae_ef_2a_50],
  ['abcdefghi', 0x8d_a9_88_af],
  ['abcdefghij', 0x39_81_70_3a],
  ['123456789', 0xcb_f4_39_26], // "check" value from the CRC catalogue
  ['The quick brown fox jumps over the lazy dog', 0x41_4f_a3_39],
  ['Discard medicine more than two years old.', 0x6b_9c_df_e7],
  ['He who has a shady past knows that nice guys finish last.', 0xc9_0e_f7_3f],
  ["I wouldn't marry him with a ten foot pole.", 0xb9_02_34_1f],
  ['Free! Free!/A trip/to Mars/for 900/empty jars/Burma Shave', 0x04_20_80_e8],
  ['The days of the digital watch are numbered.  -Tom Stoppard', 0x15_4c_6d_11],
  ["Nepal premier won't resign.", 0x4c_41_83_25],
  ['For every action there is an equal and opposite government program.', 0x33_95_51_50],
  ["His money is twice tainted: 'taint yours and 'taint mine.", 0x26_21_6a_4b],
  ['There is no reason for any individual to have a computer in their home. -Ken Olsen, 1977', 0x1a_bb_e4_5e],
  ["It's a tiny change to the code and not completely disgusting. - Bob Manchek", 0xc8_9a_94_f7],
  ['size:  a.out:  bad magic', 0xab_3a_be_14],
  ['The major problem is with sendmail.  -Mark Horton', 0xba_b1_02_b6],
  ['Give me a rock, paper and scissors and I will move the world.  CCFestoon', 0x99_91_49_d7],
  ['If the enemy is within range, then so are you.', 0x6d_52_a3_3c],
  ["It's well we cannot hear the screams/That we create in others' dreams.", 0x90_63_1e_8d],
  ["You remind me of a TV show, but that's all right: I watch it anyway.", 0x78_30_91_30],
  ['C is as portable as Stonehedge!!', 0x7d_0a_37_7f],
  ['Even if I could be Shakespeare, I think I should still choose to be Faraday. - A. Huxley', 0x8c_79_fd_79],
  ['The fugacity of a constituent in a mixture of gases at a given temperature is proportional to its mole fraction.  Lewis-Randall Rule', 0xa2_0b_71_67],
  ['How can you write a big system without C++?  -Paul Glick', 0x8e_0b_b4_43],
]

const zeros = (n) => new Uint8Array(n)
const filled = (n, v) => new Uint8Array(n).fill(v)
const incrementing = (n) => Uint8Array.from({ length: n }, (_, i) => i & 0xff)
const decrementing = (n) => Uint8Array.from({ length: n }, (_, i) => (n - 1 - i) & 0xff)

// prettier-ignore
const BYTES = [
  ['[0] x32', zeros(32), 0x19_0a_55_ad],
  ['[255] x32', filled(32, 0xff), 0xff_6c_ab_0b],
  ['0..31', incrementing(32), 0x91_26_7e_8a],
  ['31..0', decrementing(32), 0x9a_b0_ef_72],
  ['0..63', incrementing(64), 0x10_0e_ce_8c],
  ['[0] x65', zeros(65), 0x1d_cd_f7_77],
  ['0..64', incrementing(65), 0x40_c0_6f_d8],
  ['0..255', incrementing(256), 0x29_05_8c_73],
  ['[0] x512', zeros(512), 0xb2_aa_75_78],
  ['[0] x1024', zeros(1024), 0xef_b5_af_2e],
  ['[255] x1024', filled(1024, 0xff), 0xb8_3a_ff_f4],
  ['(0..255) x4', incrementing(1024), 0xb7_0b_4c_26],
  ['(0..255) x16', incrementing(4096), 0xa2_91_20_82],
]

const INVALID = [
  null,
  undefined,
  [],
  [1, 2],
  'string',
  '',
  0,
  12,
  {},
  new Uint16Array(1),
  new Uint8ClampedArray(1),
  new Int8Array(1),
  new ArrayBuffer(4),
  new DataView(new ArrayBuffer(4)),
]

const seed = randomValues(2048) // enough for the largest size + offset below

const skipLarge =
  process.env.EXODUS_TEST_PLATFORM === 'quickjs' ||
  process.env.EXODUS_TEST_PLATFORM === 'xs' ||
  process.env.EXODUS_TEST_PLATFORM === 'boa' ||
  process.env.EXODUS_TEST_PLATFORM === 'graaljs' ||
  process.env.EXODUS_TEST_PLATFORM === 'engine262'

describe('crc32', () => {
  test('invalid input', (t) => {
    for (const input of INVALID) {
      t.assert.throws(() => crc32(input), TypeError)
      t.assert.throws(() => lib.crc32(input), TypeError)
    }
  })

  test('fixtures, strings', (t) => {
    for (const [str, expected] of STRINGS) {
      const uint8 = ascii(str)
      t.assert.strictEqual(crc32reference(uint8), expected, `reference: ${str}`)
      for (const arg of [uint8, toShared(uint8), Buffer.from(uint8)]) {
        t.assert.strictEqual(crc32(arg), expected, str)
        t.assert.strictEqual(lib.crc32(arg), expected, str)
      }
    }
  })

  test('fixtures, bytes', (t) => {
    for (const [name, uint8, expected] of BYTES) {
      t.assert.strictEqual(crc32reference(uint8), expected, `reference: ${name}`)
      for (const arg of [uint8, toShared(uint8), Buffer.from(uint8)]) {
        t.assert.strictEqual(crc32(arg), expected, name)
        t.assert.strictEqual(lib.crc32(arg), expected, name)
      }
    }
  })

  test('returns an unsigned 32-bit integer', (t) => {
    for (const uint8 of [ascii('a'), ascii('abc'), seed, ...BYTES.map(([, x]) => x)]) {
      for (const res of [crc32(uint8), lib.crc32(uint8)]) {
        t.assert.strictEqual(typeof res, 'number')
        t.assert.ok(Number.isInteger(res))
        t.assert.ok(res >= 0 && res <= 0xff_ff_ff_ff)
        t.assert.strictEqual(res >>> 0, res)
      }
    }

    // Values with the top bit set stay positive
    t.assert.strictEqual(crc32(ascii('a')), 0xe8_b7_be_43)
    t.assert.ok(crc32(ascii('a')) > 0x7f_ff_ff_ff)
  })

  test('does not depend on the buffer around the view', (t) => {
    for (const size of [
      0, 1, 3, 4, 5, 15, 16, 17, 63, 64, 65, 100, 255, 256, 257, 511, 512, 513, 1024, 1025,
    ]) {
      for (const offset of [0, 1, 2, 3, 4, 5, 6, 7, 64, 65, 100, 101]) {
        if (offset + size > seed.length) continue
        const arr = seed.subarray(offset, offset + size)
        const copy = Uint8Array.from(arr)
        t.assert.strictEqual(copy.byteOffset, 0)
        const expected = crc32reference(copy)
        t.assert.strictEqual(crc32(copy), expected, `x${size} copy`)
        t.assert.strictEqual(crc32(arr), expected, `x${size} +${offset}`)
        t.assert.strictEqual(lib.crc32(arr), expected, `x${size} +${offset}`)
        t.assert.strictEqual(crc32(toShared(arr, offset)), expected, `x${size} +${offset} shared`)
        t.assert.strictEqual(
          lib.crc32(toShared(arr, offset)),
          expected,
          `x${size} +${offset} shared`
        )
        const buffer = Buffer.from(arr) // pooled on small sizes, so has arbitrary byteOffset
        t.assert.strictEqual(crc32(buffer), expected, `x${size} +${offset} Buffer`)
        t.assert.strictEqual(lib.crc32(buffer), expected, `x${size} +${offset} Buffer`)
      }
    }
  })

  test('sizes and offsets, random data', (t) => {
    // All small sizes at all alignments: covers the byte path with all tail lengths, and crosses
    // both native thresholds of the Node.js entry (64 on arm64 before 24.9, 256 elsewhere)
    for (let offset = 0; offset < 8; offset++) {
      for (let size = 0; size <= 300; size++) {
        const arr = seed.subarray(offset, offset + size)
        const expected = crc32reference(arr)
        t.assert.strictEqual(crc32(arr), expected, `random x${size} +${offset}`)
        t.assert.strictEqual(lib.crc32(arr), expected, `random x${size} +${offset}`)
        t.assert.strictEqual(
          crc32(toShared(arr, offset)),
          expected,
          `random x${size} +${offset} shared`
        )
        t.assert.strictEqual(
          lib.crc32(toShared(arr, offset)),
          expected,
          `random x${size} +${offset} shared`
        )
        t.assert.strictEqual(crc32(Buffer.from(arr)), expected, `random x${size} +${offset} Buffer`)
      }
    }
  })

  test('sizes, random data, around the word-sliced threshold', (t) => {
    // crc.js switches to 32-bit reads above 1024 bytes: cross it at all alignment prefixes and tail lengths
    for (let size = 960; size <= 1100; size++) {
      const offset = size & 7
      const arr = seed.subarray(offset, offset + size)
      t.assert.strictEqual(arr.length, size)
      const expected = lib.crc32(arr)
      t.assert.strictEqual(crc32(arr), expected, `random x${size} +${offset}`)
      t.assert.strictEqual(
        crc32(toShared(arr, offset)),
        expected,
        `random x${size} +${offset} shared`
      )
      t.assert.strictEqual(
        lib.crc32(toShared(arr, offset)),
        expected,
        `random x${size} +${offset} shared`
      )
      t.assert.strictEqual(crc32(Buffer.from(arr)), expected, `random x${size} +${offset} Buffer`)
      if (size % 64 === 0)
        t.assert.strictEqual(crc32reference(arr), expected, `random x${size} reference`)
    }
  })

  test('large input', { skip: skipLarge }, (t) => {
    const block = new Uint8Array(64 * seed.length)
    for (let k = 0; k < 64; k++)
      block.set(
        seed.map((x, j) => x + k * j),
        k * seed.length
      )
    const large = new Uint8Array(64 * block.length + 7)
    for (let i = 0; i < large.length; i += block.length) {
      large.set(block.subarray(0, large.length - i), i)
    }

    for (const offset of [0, 1, 2, 3, 4, 7]) {
      for (const size of [block.length, large.length - 7]) {
        const arr = large.subarray(offset, offset + size)
        const expected = lib.crc32(arr)
        t.assert.strictEqual(crc32(arr), expected, `large x${size} +${offset}`)
        t.assert.strictEqual(
          crc32(toShared(arr, offset)),
          expected,
          `large x${size} +${offset} shared`
        )
        t.assert.strictEqual(
          lib.crc32(toShared(arr, offset)),
          expected,
          `large x${size} +${offset} shared`
        )
      }
    }

    // The reference is affordable once on a 64 KiB block
    t.assert.strictEqual(crc32reference(block), lib.crc32(block), 'reference x65536')
  })
})
