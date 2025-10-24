import { utf8toString, utf8toStringLoose, utf8fromString, utf8fromStringLoose } from '../utf8.js'
import * as js from '../fallback/utf8.js'
import { fromHex } from '@exodus/bytes/hex.js'
import { describe, test } from 'node:test'

// invalid bytes -> string
const nonUtf8 = [
  { bytes: [0, 254, 255], charcodes: [0, 0xff_fd, 0xff_fd] },
  { bytes: [0x80], charcodes: [0xff_fd] },
  { bytes: [0xf0, 0x90, 0x80], charcodes: [0xff_fd] }, // https://npmjs.com/package/buffer is wrong
  { bytes: [0xf0, 0x80, 0x80], charcodes: [0xff_fd, 0xff_fd, 0xff_fd] }, // https://github.com/nodejs/node/issues/16894
]

// invalid string -> bytes
const orphans = [
  { charcodes: [0x61, 0x62, 0xd8_00, 0x77, 0x78], hex: '6162efbfbd7778' },
  { charcodes: [0xd8_00, 0xd8_00], hex: 'efbfbdefbfbd' }, // https://npmjs.com/package/buffer is wrong
  { charcodes: [0x61, 0x62, 0xdf_ff, 0x77, 0x78], hex: '6162efbfbd7778' },
  { charcodes: [0xdf_ff, 0xd8_00], hex: 'efbfbdefbfbd' },
]

describe('utf8toString', () => {
  describe('invalid input', () => {
    for (const method of [utf8toString, utf8toStringLoose]) {
      test(method.name, (t) => {
        for (const input of [null, undefined, [], [1, 2], new Uint16Array(1), 'string']) {
          t.assert.throws(() => method(input))
        }
      })
    }
  })

  test('non-utf8 bytes throw in utf8toString', (t) => {
    for (const { bytes } of nonUtf8) {
      t.assert.throws(() => utf8toString(Uint8Array.of(...bytes)))
    }
  })

  test('non-utf8 bytes get replaced in utf8toStringLoose', (t) => {
    for (const { bytes, charcodes } of nonUtf8) {
      const res = utf8toStringLoose(Uint8Array.of(...bytes))
      t.assert.strictEqual(res.length, charcodes.length)
      t.assert.strictEqual(res, String.fromCharCode(...charcodes))
    }
  })
})

describe('utf8fromString', () => {
  describe('invalid input', () => {
    for (const method of [utf8fromString, utf8fromStringLoose]) {
      test(method.name, (t) => {
        for (const input of [...[null, undefined, [], [1, 2], ['00'], new Uint8Array()]]) {
          t.assert.throws(() => method(input))
          for (const form of ['uint8', 'buffer', 'hex']) {
            t.assert.throws(() => method(input, form))
          }
        }
      })
    }
  })

  test('orphans throw in utf8fromString', (t) => {
    for (const { charcodes } of orphans) {
      t.assert.throws(() => utf8fromString(String.fromCharCode(...charcodes)))
    }
  })

  test('orphans get replaced in utf8fromStringLoose', (t) => {
    for (const { charcodes, hex } of orphans) {
      t.assert.deepStrictEqual(utf8fromStringLoose(String.fromCharCode(...charcodes)), fromHex(hex))
    }
  })
})

describe('fallback.decode', () => {
  test('non-utf8 bytes throw in fallback', (t) => {
    for (const { bytes } of nonUtf8) {
      t.assert.throws(() => js.decode(Uint8Array.of(...bytes)))
    }
  })

  test('non-utf8 bytes get replaced in loose fallback', (t) => {
    for (const { bytes, charcodes } of nonUtf8) {
      const res = js.decode(Uint8Array.of(...bytes), true)
      t.assert.strictEqual(res.length, charcodes.length)
      t.assert.strictEqual(res, String.fromCharCode(...charcodes))
    }
  })
})

describe('fallback.encode', () => {
  test('orphans throw in fallback', (t) => {
    for (const { charcodes } of orphans) {
      t.assert.throws(() => js.encode(String.fromCharCode(...charcodes)))
    }
  })

  test('orphans get replaced in loose fallback', (t) => {
    for (const { charcodes, hex } of orphans) {
      t.assert.deepStrictEqual(js.encode(String.fromCharCode(...charcodes), true), fromHex(hex))
    }
  })
})

// e.g. npmjs.com/buffer fails on this
test('large strings', (t) => {
  const s = 'abcde01234'.repeat(12e6) // 120e6 total
  t.assert.strictEqual(s, utf8toString(utf8fromString(s)))
})
