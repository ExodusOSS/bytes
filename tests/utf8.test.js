import {
  utf8toString,
  utf8toStringLoose,
  utf8fromString,
  utf8fromStringLoose,
} from '@exodus/bytes/utf8.js'
import { nativeDecoder } from '../fallback/_utils.js'
import * as js from '../fallback/utf8.js'
import { fromHex } from '@exodus/bytes/hex.js'
import { randomValues } from '@exodus/crypto/randomBytes'
import { describe, test } from 'node:test'

const seed = randomValues(5 * 1024)
const pool = [
  new Uint8Array(0),
  new Uint8Array(1),
  new Uint8Array(256),
  new Uint8Array(256).fill(1),
  new Uint8Array(256).fill(42),
  new Uint8Array(256).fill(0xd0),
  new Uint8Array(256).fill(255),
  seed.subarray(1, -1),
  seed.subarray(2, -2),
  seed.subarray(3, -3),
]

for (let i = 0; i < 500; i++) {
  pool.push(seed.subarray(Math.floor(Math.random() * seed.length)).map((x, j) => x + i * j))
}

const poolAscii = pool.map((u8) => u8.map((x) => x & 0x7f))

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

const { TextDecoder, TextEncoder } = globalThis

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
    for (const method of [utf8toString, (x) => js.decode(x, false)]) {
      for (const { bytes } of nonUtf8) {
        t.assert.throws(() => method(Uint8Array.of(...bytes)))

        for (let p = 0; p < 130; p++) {
          const prefixBytes = new Uint8Array(p).fill(0x20)
          t.assert.throws(() => method(Uint8Array.of(...prefixBytes, ...bytes)))
        }

        for (let s = 0; s < 130; s++) {
          const suffixBytes = new Uint8Array(s).fill(0x20)
          t.assert.throws(() => method(Uint8Array.of(...bytes, ...suffixBytes)))
        }
      }
    }
  })

  test('non-utf8 bytes get replaced in utf8toStringLoose', (t) => {
    for (const method of [utf8toStringLoose, (x) => js.decode(x, true)]) {
      for (const { bytes, charcodes } of nonUtf8) {
        const res = method(Uint8Array.of(...bytes))
        t.assert.strictEqual(res.length, charcodes.length)
        t.assert.strictEqual(res, String.fromCharCode(...charcodes))

        for (let p = 0; p < 130; p++) {
          const prefixBytes = new Uint8Array(p).fill(0x20)
          const prefixString = ' '.repeat(p)
          const res = method(Uint8Array.of(...prefixBytes, ...bytes))
          t.assert.strictEqual(res.length, p + charcodes.length)
          t.assert.strictEqual(res, prefixString + String.fromCharCode(...charcodes))
        }

        for (let s = 0; s < 130; s++) {
          const suffixBytes = new Uint8Array(s).fill(0x20)
          const suffixString = ' '.repeat(s)
          const res = method(Uint8Array.of(...bytes, ...suffixBytes))
          t.assert.strictEqual(res.length, charcodes.length + s)
          t.assert.strictEqual(res, String.fromCharCode(...charcodes) + suffixString)
        }
      }
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
    for (const method of [utf8fromString, (s) => js.encode(s, false)]) {
      for (const { charcodes } of orphans) {
        t.assert.throws(() => method(String.fromCharCode(...charcodes)))
      }
    }
  })

  test('orphans get replaced in utf8fromStringLoose', (t) => {
    for (const method of [utf8fromStringLoose, (s) => js.encode(s, true)]) {
      for (const { charcodes, hex } of orphans) {
        t.assert.deepStrictEqual(method(String.fromCharCode(...charcodes)), fromHex(hex))
      }
    }
  })
})

describe('random data', () => {
  const strings = []
  const stringsAscii = []
  const restored = []

  test('utf8toStringLoose', (t) => {
    const textDecoder = nativeDecoder ? new TextDecoder() : null // polyfilled might be wrong
    const NativeBuffer = globalThis.Buffer && !globalThis.Buffer.TYPED_ARRAY_SUPPORT ? Buffer : null
    for (const u8 of pool) {
      const str = utf8toStringLoose(u8)
      t.assert.strictEqual(str, js.decode(u8, true))
      if (textDecoder) t.assert.strictEqual(str, textDecoder.decode(u8))
      if (NativeBuffer) t.assert.strictEqual(str, NativeBuffer.from(u8).toString())
      strings.push(str)
    }
  })

  test('utf8toString (ascii)', (t) => {
    const textDecoder = TextDecoder ? new TextDecoder('utf8', { fatal: true }) : null
    for (const u8 of poolAscii) {
      const str = utf8toString(u8)
      t.assert.strictEqual(str, utf8toStringLoose(u8))
      t.assert.strictEqual(str, js.decode(u8, false))
      t.assert.strictEqual(str, js.decode(u8, true))
      if (textDecoder) t.assert.strictEqual(str, textDecoder.decode(u8))
      if (globalThis.Buffer) t.assert.strictEqual(str, Buffer.from(u8).toString())
      stringsAscii.push(str)
    }
  })

  test('utf8toString', (t) => {
    const textDecoder = TextDecoder ? new TextDecoder('utf8', { fatal: true }) : null
    t.assert.strictEqual(strings.length, pool.length)
    for (let i = 0; i < pool.length; i++) {
      const u8 = pool[i]
      let str
      try {
        str = utf8toString(u8)
      } catch (e) {
        if (!(e instanceof TypeError)) throw new Error('Unexpected error')
      }

      if (str === undefined) {
        t.assert.throws(() => js.decode(u8, false))
        if (textDecoder) t.assert.throws(() => textDecoder.decode(u8))
      } else {
        t.assert.strictEqual(str, strings[i])
        t.assert.strictEqual(str, utf8toStringLoose(u8))
        t.assert.strictEqual(str, js.decode(u8, false))
        t.assert.strictEqual(str, js.decode(u8, true))
        if (textDecoder) t.assert.strictEqual(str, textDecoder.decode(u8))
        if (globalThis.Buffer) t.assert.strictEqual(str, Buffer.from(u8).toString())
      }
    }
  })

  test('utf8fromString (ascii)', (t) => {
    const textEncoder = TextEncoder ? new TextEncoder() : null
    t.assert.strictEqual(stringsAscii.length, poolAscii.length)
    for (let i = 0; i < poolAscii.length; i++) {
      const u8 = poolAscii[i]
      const str = stringsAscii[i]
      t.assert.deepStrictEqual(u8, utf8fromString(str))
      t.assert.deepStrictEqual(u8, utf8fromStringLoose(str))
      t.assert.deepStrictEqual(u8, js.encode(str, false))
      t.assert.deepStrictEqual(u8, js.encode(str, true))
      t.assert.deepStrictEqual(u8, textEncoder.encode(str))
      if (globalThis.Buffer) t.assert.deepEqual(u8, Buffer.from(str))
    }
  })

  test('utf8fromString / utf8fromStringLoose', (t) => {
    const textEncoder = TextEncoder ? new TextEncoder() : null
    t.assert.strictEqual(strings.length, pool.length)
    for (let i = 0; i < pool.length; i++) {
      const str = strings[i]
      const u8 = utf8fromString(str)
      t.assert.deepStrictEqual(u8, utf8fromStringLoose(str))
      t.assert.deepStrictEqual(u8, js.encode(str, false))
      t.assert.deepStrictEqual(u8, js.encode(str, true))
      t.assert.deepStrictEqual(u8, textEncoder.encode(str))
      if (globalThis.Buffer) t.assert.deepEqual(u8, Buffer.from(str))
      restored.push(u8)
    }
  })

  test('utf8toString / utf8toStringLoose', (t) => {
    const textDecoder = TextDecoder ? new TextDecoder('utf8', { fatal: true }) : null
    t.assert.strictEqual(strings.length, pool.length)
    for (let i = 0; i < pool.length; i++) {
      const str = strings[i]
      const u8 = restored[i]
      t.assert.strictEqual(str, utf8toString(u8))
      t.assert.strictEqual(str, utf8toStringLoose(u8))
      t.assert.strictEqual(str, js.decode(u8, false))
      t.assert.strictEqual(str, js.decode(u8, true))
      if (textDecoder) t.assert.strictEqual(str, textDecoder.decode(u8))
      if (globalThis.Buffer) t.assert.strictEqual(str, Buffer.from(u8).toString())
    }
  })
})

// e.g. npmjs.com/buffer fails on this
test('large strings', (t) => {
  const s = 'abcde01234'.repeat(12e6) // 120e6 total
  t.assert.strictEqual(s, utf8toString(utf8fromString(s)))
})
