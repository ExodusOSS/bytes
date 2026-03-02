import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, describe } from 'node:test'
import { createSinglebyteDecoder, createSinglebyteEncoder } from '@exodus/bytes/single-byte.js'
import { encodingDecoder, getEncoding } from '../fallback/single-byte.js'
import encodingsObject from '../fallback/single-byte.encodings.js'
import { singleByte } from './encoding/fixtures/indexes.cjs'

const encodings = Object.keys(encodingsObject)
const nonWhatwg = new Set(['iso-8859-1', 'iso-8859-9', 'iso-8859-11'])

const SharedArrayBuffer = globalThis.SharedArrayBuffer ?? ArrayBuffer
const toShared = (u8) => {
  const res = new Uint8Array(new SharedArrayBuffer(u8.length))
  res.set(u8)
  return res
}

// See also tests/encoding/single-byte.tables.test.js for similar TextDecoder tests

describe('single-byte encodings are supersets of ascii', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createSinglebyteDecoder(encoding)
      const encoder = createSinglebyteEncoder(encoding)
      for (let i = 0; i < 128; i++) {
        let str
        try {
          str = decoder(Uint8Array.of(i))
        } catch (cause) {
          throw new Error(`Error decoding ${i} in ${encoding}`, { cause })
        }

        t.assert.strictEqual(str.length, 1, i)
        t.assert.strictEqual(str.codePointAt(0), i, i)
        t.assert.strictEqual(decoder(toShared(Uint8Array.of(i))), str)
        t.assert.deepStrictEqual(encoder(str), Uint8Array.of(i))
      }
    })
  }
})

describe('single-byte encodings match fallback', () => {
  for (const encoding of encodings) {
    test(encoding, (t) => {
      const decoder = createSinglebyteDecoder(encoding)
      const decoderLoose = createSinglebyteDecoder(encoding, true)
      const fallback = encodingDecoder(encoding)
      for (let i = 0; i < 256; i++) {
        const u8 = Uint8Array.of(i)
        const s8 = toShared(u8)
        let found = false
        let str
        try {
          str = decoder(u8)
          found = true
        } catch {}

        if (found) {
          t.assert.strictEqual(str.length, 1)
          t.assert.notEqual(str, '\uFFFD')
          t.assert.strictEqual(decoderLoose(u8), str)
          t.assert.strictEqual(decoder(s8), str)
          t.assert.strictEqual(decoderLoose(s8), str)
          t.assert.strictEqual(fallback(u8), str)
          t.assert.strictEqual(fallback(u8, true), str)
        } else {
          t.assert.ok(i >= 128)
          t.assert.throws(() => decoder(s8))
          t.assert.throws(() => fallback(u8))
          str = decoderLoose(u8)
          t.assert.strictEqual(str.length, 1)
          t.assert.strictEqual(str, '\uFFFD')
          t.assert.strictEqual(decoderLoose(s8), str)
          t.assert.strictEqual(fallback(u8, true), str)
        }
      }
    })
  }
})

describe('single-byte encodings index: Unicode', () => {
  for (const encoding of encodings) {
    let fileName
    let allowSuperset = false
    if (encoding.startsWith('iso-8859-')) {
      fileName = `ISO8859/${encoding.replace('iso-', '')}.txt`
    } else if (encoding.startsWith('windows-')) {
      fileName = `VENDORS/MICSFT/WINDOWS/CP${encoding.replace('windows-', '')}.txt`
      allowSuperset = true
    } else {
      continue
    }

    test(encoding, (t) => {
      const decoder = createSinglebyteDecoder(encoding)
      const decoderLoose = createSinglebyteDecoder(encoding, true)
      const encoder = createSinglebyteEncoder(encoding)
      const text = readFileSync(
        join(import.meta.dirname, 'encoding/fixtures/unicode/', fileName),
        'utf8'
      )
      const rows = text
        .split('\n')
        .map((x) => x.trim())
        .filter((x) => x && x[0] !== '#')
        .map((x) => x.split('\t'))
        .filter((x) => !(['', '      '].includes(x[1]) && x[2] === '#UNDEFINED'))
        .map(([iHex, codeHex]) => {
          const id = `${fileName}: ${iHex} -> ${codeHex}`
          const i = parseInt(iHex.slice(2), 16)
          t.assert.ok(i < 256)
          const code = parseInt(codeHex.slice(2), 16)
          t.assert.strictEqual('0x' + i.toString(16).padStart(2, '0').toUpperCase(), iHex, id)
          t.assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex, id)
          t.assert.ok(i === 0 || code !== 0, id)
          t.assert.ok(code !== 0xff_fd && code <= 0xff_ff, id) // can't be a replacement char, has to be <= 16-bit
          t.assert.ok(code < 0xd8_00 || code >= 0xe0_00, id) // not a surrogate
          t.assert.ok(i > 0x7f || code === i, id)
          return [i, code]
        })

      t.assert.ok(rows.length >= 128 && rows.length <= 256)
      const known = new Map(rows)
      t.assert.strictEqual(rows.length, known.size) // all unique

      for (let byte = 0; byte < 256; byte++) {
        let code = known.get(byte)
        let str
        if (allowSuperset && code === undefined) {
          try {
            const dec = decoder(Uint8Array.of(byte))
            // if it doesn't throw, it should map to the same byte, except windows-1255 which adds more non-trivial entries
            code = encoding === 'windows-1255' ? dec.codePointAt(0) : byte
          } catch {}
        }

        if (code === undefined) {
          t.assert.throws(() => decoder(Uint8Array.of(byte)))
          t.assert.throws(() => decoder(toShared(Uint8Array.of(byte))))
          try {
            str = decoderLoose(Uint8Array.of(byte))
          } catch (cause) {
            throw new Error(`Error decoding unmapped ${byte} in ${encoding}`, { cause })
          }

          t.assert.strictEqual(str.length, 1)
          t.assert.strictEqual(str.codePointAt(0), 0xff_fd)
          t.assert.strictEqual(decoderLoose(toShared(Uint8Array.of(byte))), str)
        } else {
          try {
            str = decoder(Uint8Array.of(byte))
          } catch (cause) {
            throw new Error(`Error decoding ${byte} in ${encoding}: ${byte}`, { cause })
          }

          t.assert.strictEqual(str.length, 1, byte)
          t.assert.strictEqual(str.codePointAt(0), code, byte)
          t.assert.strictEqual(decoderLoose(Uint8Array.of(byte)), str)
          t.assert.strictEqual(decoder(toShared(Uint8Array.of(byte))), str)
          t.assert.strictEqual(decoderLoose(toShared(Uint8Array.of(byte))), str)
          const u8 = encoder(str)
          t.assert.deepStrictEqual(u8, Uint8Array.of(byte))
          t.assert.strictEqual(u8.byteLength, u8.buffer.byteLength)
        }
      }
    })
  }
})

describe('single-byte encodings index: WHATWG', () => {
  for (const encoding of encodings) {
    if (nonWhatwg.has(encoding)) continue
    test(encoding, (t) => {
      const decoder = createSinglebyteDecoder(encoding)
      const decoderLoose = createSinglebyteDecoder(encoding, true)
      const encoder = createSinglebyteEncoder(encoding)
      const text = readFileSync(
        join(import.meta.dirname, 'encoding/fixtures/single-byte', `index-${encoding}.txt`),
        'utf8'
      )
      const rows = text
        .split('\n')
        .map((x) => x.trim())
        .filter((x) => x && x[0] !== '#')
        .map((x) => x.split('\t'))
        .map(([istr, codeHex, description]) => {
          const i = Number(istr)
          t.assert.ok(i < 128)
          const code = parseInt(codeHex.slice(2), 16)
          t.assert.strictEqual(`${i}`, istr)
          t.assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
          t.assert.ok(code && code !== 0xff_fd && code <= 0xff_ff) // can't be a replacement char, has to be <= 16-bit
          t.assert.ok(code < 0xd8_00 || code >= 0xe0_00) // not a surrogate
          return [i, { i, code, description }]
        })

      t.assert.ok(rows.length <= 128)
      const known = new Map(rows)
      t.assert.strictEqual(rows.length, known.size) // all unique

      for (let i = 0; i < 128; i++) {
        const row = known.get(i)
        const byte = i + 128
        let str
        if (row) {
          t.assert.strictEqual(i, row.i)
          try {
            str = decoder(Uint8Array.of(byte))
          } catch (cause) {
            throw new Error(`Error decoding ${byte} in ${encoding}: ${row.description}`, { cause })
          }

          t.assert.strictEqual(str.length, 1, row.description)
          t.assert.strictEqual(str.codePointAt(0), row.code, row.description)
          t.assert.strictEqual(str, decoderLoose(Uint8Array.of(byte)))
          t.assert.strictEqual(decoder(toShared(Uint8Array.of(byte))), str)
          t.assert.strictEqual(decoderLoose(toShared(Uint8Array.of(byte))), str)
          const u8 = encoder(str)
          t.assert.deepStrictEqual(u8, Uint8Array.of(byte))
          t.assert.strictEqual(u8.byteLength, u8.buffer.byteLength)
        } else {
          t.assert.throws(() => decoder(Uint8Array.of(byte)))
          t.assert.throws(() => decoder(toShared(Uint8Array.of(byte))))
          try {
            str = decoderLoose(Uint8Array.of(byte))
          } catch (cause) {
            throw new Error(`Error decoding unmapped ${byte} in ${encoding}`, { cause })
          }

          t.assert.strictEqual(str.length, 1)
          t.assert.strictEqual(str.codePointAt(0), 0xff_fd)
          t.assert.strictEqual(decoderLoose(toShared(Uint8Array.of(byte))), str)
        }
      }
    })
  }
})

describe('single-byte encodings index: WHATWG non-normative indexes.json', () => {
  for (const [encoding, data] of Object.entries(singleByte)) {
    test(encoding, (t) => {
      t.assert.ok(!data.includes(0))
      t.assert.ok(!data.includes(0xff_fd))

      t.assert.ok(Object.hasOwn(encodingsObject, encoding))
      const m = getEncoding(encoding).map((x) => (x === 0xff_fd ? null : x))
      while (m.length < 128) m.push(128 + m.length)

      t.assert.deepStrictEqual(m, data)

      const decoder = createSinglebyteDecoder(encoding)
      const decoderLoose = createSinglebyteDecoder(encoding, true)
      const encoder = createSinglebyteEncoder(encoding)

      t.assert.strictEqual(data.length, 128)
      for (let i = 0; i < data.length; i++) {
        const byte = i + 128
        t.assert.notEqual(data[i], 0)
        t.assert.notEqual(data[i], 0xff_fd)
        const str = data[i] === null ? null : String.fromCodePoint(data[i])

        if (str) {
          t.assert.ok(data[i] > 0)
          t.assert.ok(data[i] <= 0xff_ff)
          t.assert.strictEqual(decoder(Uint8Array.of(byte)), str)
          t.assert.strictEqual(decoderLoose(Uint8Array.of(byte)), str)
          t.assert.strictEqual(decoder(toShared(Uint8Array.of(byte))), str)
          t.assert.strictEqual(decoderLoose(toShared(Uint8Array.of(byte))), str)
          const u8 = encoder(str)
          t.assert.deepStrictEqual(u8, Uint8Array.of(byte))
          t.assert.strictEqual(u8.byteLength, u8.buffer.byteLength)
        } else {
          t.assert.throws(() => decoder(Uint8Array.of(byte)))
          t.assert.throws(() => decoder(toShared(Uint8Array.of(byte))))
          t.assert.strictEqual(decoderLoose(Uint8Array.of(byte)), '\uFFFD')
          t.assert.strictEqual(decoderLoose(toShared(Uint8Array.of(byte))), '\uFFFD')
        }
      }
    })
  }
})

// https://encoding.spec.whatwg.org/#x-user-defined-decoder
describe('x-user-defined', () => {
  const encoding = 'x-user-defined'
  test('decode', (t) => {
    const decoder = createSinglebyteDecoder(encoding)
    const decoderLoose = createSinglebyteDecoder(encoding, true)
    for (let byte = 0; byte < 256; byte++) {
      const str = String.fromCodePoint(byte >= 0x80 ? 0xf7_80 + byte - 0x80 : byte)
      t.assert.strictEqual(decoder(Uint8Array.of(byte)), str, byte)
      t.assert.strictEqual(decoderLoose(Uint8Array.of(byte)), str, byte)
      t.assert.strictEqual(decoder(toShared(Uint8Array.of(byte))), str, byte)
      t.assert.strictEqual(decoderLoose(toShared(Uint8Array.of(byte))), str, byte)
    }
  })

  test('encode', (t) => {
    const encoder = createSinglebyteEncoder(encoding)
    for (let byte = 0; byte < 256; byte++) {
      const str = String.fromCodePoint(byte >= 0x80 ? 0xf7_80 + byte - 0x80 : byte)
      const u8 = encoder(str)
      t.assert.deepStrictEqual(u8, Uint8Array.of(byte))
      t.assert.strictEqual(u8.byteLength, u8.buffer.byteLength)
    }

    for (let i = 128; i < 512; i++) {
      t.assert.throws(() => encoder(String.fromCodePoint(i)), /Input is not well-formed/)
    }
  })
})

describe('codes above 0x7F are non-ASCII', () => {
  // 0x80 maps to U+80
  for (const encoding of ['iso-8859-2', 'iso-8859-16']) {
    test(encoding, (t) => {
      const encoder = createSinglebyteEncoder(encoding)
      t.assert.deepStrictEqual(encoder('\x80'), new Uint8Array(1).fill(0x80))
      t.assert.deepStrictEqual(encoder('\x80'.repeat(4)), new Uint8Array(4).fill(0x80))
      t.assert.deepStrictEqual(encoder('\x80'.repeat(8)), new Uint8Array(8).fill(0x80))
      t.assert.deepStrictEqual(encoder('\x80'.repeat(16)), new Uint8Array(16).fill(0x80))
    })
  }

  // 0x80 maps to something else
  for (const encoding of ['windows-1250', 'windows-1252', 'x-user-defined']) {
    test(encoding, (t) => {
      const encoder = createSinglebyteEncoder(encoding)
      t.assert.throws(() => encoder('\x80'))
      t.assert.throws(() => encoder('\x80'.repeat(4)))
      t.assert.throws(() => encoder('\x80'.repeat(8)))
      t.assert.throws(() => encoder('\x80'.repeat(16)))
    })
  }
})
