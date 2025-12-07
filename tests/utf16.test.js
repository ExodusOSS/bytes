import * as utf16 from '@exodus/bytes/utf16.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import * as js from '../fallback/utf16.js'
import { describe, test } from 'node:test'

const orphans = [
  { invalid: [0x61, 0x62, 0xd8_00, 0x77, 0x78], replaced: [0x61, 0x62, 0xff_fd, 0x77, 0x78] },
  { invalid: [0xd8_00], replaced: [0xff_fd] },
  { invalid: [0xd8_00, 0xd8_00], replaced: [0xff_fd, 0xff_fd] },
  { invalid: [0x61, 0x62, 0xdf_ff, 0x77, 0x78], replaced: [0x61, 0x62, 0xff_fd, 0x77, 0x78] },
  { invalid: [0xdf_ff, 0xd8_00], replaced: [0xff_fd, 0xff_fd] },
]

const seed = randomValues(5 * 1024)
const seed1 = seed.slice(1, -1)
const seed2 = seed.slice(2, -2)
const seed3 = seed.slice(3, -3)
const pool = [
  new Uint16Array(0),
  new Uint16Array(2),
  new Uint16Array(256),
  new Uint16Array(256).fill(1),
  new Uint16Array(256).fill(42),
  new Uint16Array(256).fill(255),
  new Uint16Array(256).fill(0xd0_00),
  new Uint16Array(256).fill(0xdf_ff),
  new Uint16Array(256).fill(0xff_ff),
  new Uint16Array(seed.buffer, seed.byteOffset, seed.byteLength / 2),
  new Uint16Array(seed1.buffer, seed1.byteOffset, seed1.byteLength / 2),
  new Uint16Array(seed2.buffer, seed2.byteOffset, seed2.byteLength / 2),
  new Uint16Array(seed3.buffer, seed3.byteOffset, seed3.byteLength / 2),
]

for (let i = 0; i < 500; i++) {
  const offset = Math.floor((Math.random() * seed.length) / 2) * 2
  const u8 = seed.subarray(offset).map((x, j) => x + i * j)
  pool.push(new Uint16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2))
}

describe('utf16toString', () => {
  describe('invalid input', () => {
    for (const method of [utf16.utf16toString, utf16.utf16toStringLoose]) {
      test(method.name, (t) => {
        for (const x of [null, undefined, [], [1, 2], 'string']) t.assert.throws(() => method(x))
        t.assert.throws(() => method(new Uint8Array(0)))
        t.assert.throws(() => method(new Uint8Array(0), 'uint16'))
        t.assert.doesNotThrow(() => method(new Uint8Array(0), 'uint8-le'))
        t.assert.doesNotThrow(() => method(new Uint8Array(0), 'uint8-be'))
        t.assert.throws(() => method(new Uint16Array(0), 'uint8-le'))
        t.assert.throws(() => method(new Uint16Array(0), 'uint8-le'))
        t.assert.doesNotThrow(() => method(new Uint16Array(0)))
        t.assert.doesNotThrow(() => method(new Uint16Array(0), 'uint16'))
      })
    }
  })

  test('orphans throw in utf16toString', (t) => {
    for (const utf16toString of [utf16.utf16toString, js.decode]) {
      for (const { invalid } of orphans) {
        t.assert.throws(() => utf16toString(Uint16Array.of(...invalid)))

        for (let p = 0; p < 130; p++) {
          const prefixBytes = new Uint16Array(p).fill(0x20)
          t.assert.throws(() => utf16toString(Uint16Array.of(...prefixBytes, ...invalid)))
        }

        for (let s = 0; s < 130; s++) {
          const suffixBytes = new Uint16Array(s).fill(0x20)
          t.assert.throws(() => utf16toString(Uint16Array.of(...invalid, ...suffixBytes)))
        }
      }
    }
  })

  test('non-utf16 bytes get replaced in utf16toStringLoose', (t) => {
    for (const { invalid, replaced } of orphans) {
      for (const utf16toStringLoose of [utf16.utf16toStringLoose, (u16) => js.decode(u16, true)]) {
        const res = utf16toStringLoose(Uint16Array.of(...invalid))
        t.assert.strictEqual(res.length, invalid.length)
        t.assert.strictEqual(res, String.fromCharCode(...replaced))

        for (let p = 0; p < 130; p++) {
          const prefixBytes = new Uint16Array(p).fill(0x20)
          const prefixString = ' '.repeat(p)
          const res = utf16toStringLoose(Uint16Array.of(...prefixBytes, ...invalid))
          t.assert.strictEqual(res.length, p + invalid.length)
          t.assert.strictEqual(res, prefixString + String.fromCharCode(...replaced))
        }

        for (let s = 0; s < 130; s++) {
          const suffixBytes = new Uint16Array(s).fill(0x20)
          const suffixString = ' '.repeat(s)
          const res = utf16toStringLoose(Uint16Array.of(...invalid, ...suffixBytes))
          t.assert.strictEqual(res.length, invalid.length + s)
          t.assert.strictEqual(res, String.fromCharCode(...replaced) + suffixString)
        }
      }
    }
  })
})

describe('utf16fromString', () => {
  describe('invalid input', () => {
    for (const method of [utf16.utf16fromString, utf16.utf16fromStringLoose]) {
      test(method.name, (t) => {
        for (const input of [...[null, undefined, [], [1, 2], ['00'], new Uint8Array()]]) {
          t.assert.throws(() => method(input))
          for (const form of [undefined, 'uint16', 'uint8-le', 'uint8-be', 'buffer', 'hex']) {
            t.assert.throws(() => method(input, form))
          }
        }
      })
    }
  })

  test('orphans throw in utf16fromString', (t) => {
    for (const { invalid } of orphans) {
      for (const utf16fromString of [utf16.utf16fromString, js.encode]) {
        t.assert.throws(() => utf16fromString(String.fromCharCode(...invalid)))
      }
    }
  })

  test('orphans get replaced in utf16fromStringLoose', (t) => {
    for (const { invalid, replaced } of orphans) {
      for (const utf16fromStringLoose of [utf16.utf16fromStringLoose, (s) => js.encode(s, true)]) {
        const input = String.fromCharCode(...invalid)
        t.assert.deepStrictEqual(utf16fromStringLoose(input), Uint16Array.from(replaced))
      }
    }
  })
})

describe('random data', () => {
  test('utf16toStringLoose', (t) => {
    for (const u16 of pool) {
      const str = utf16.utf16toStringLoose(u16)
      t.assert.strictEqual(str, js.decode(u16, true))
    }
  })
})

// e.g. npmjs.com/buffer fails on this
test('large strings', (t) => {
  const s = 'abcde01234'.repeat(12e6) // 120e6 total
  t.assert.strictEqual(s, utf16.utf16toString(utf16.utf16fromString(s)))
})
