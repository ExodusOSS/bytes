import { latin1fromString, latin1toString } from '@exodus/bytes/single-byte.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'
import iconv from 'iconv-lite'
import js from 'text-encoding'

import { bufs } from './utils/random.js'
import { Table } from './utils/table.js'
import * as latin1 from '../fallback/latin1.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffset, x.byteLength)

const strings = bufs.map((x) => latin1toString(x))
const asciiBufs = bufs.map((x) => x.map((c) => (c >= 0x80 ? c - 0x80 : c)))
const asciiStrings = asciiBufs.map((x) => latin1toString(x))

const isNative = (x) => x && (!bufferIsPolyfilled || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const { TextEncoder, TextDecoder, atob, btoa } = globalThis
const textEncoder = isNative(TextEncoder) ? new TextEncoder() : null
const textDecoder = isNative(TextDecoder) ? new TextDecoder() : null
const textDecoderAscii = isNative(TextDecoder) ? new TextDecoder('ascii') : null
const textDecoderJS = new js.TextDecoder('windows-1252')
const textEncoderJS = new js.TextEncoder()

const columns = ['@exodus/bytes', '@exodus/bytes latin1', 'Buffer', 'Buffer (latin1)', 'iconv-lite']

const timeout = 30_000
describe('benchmarks: latin1', async () => {
  // [name, impl, skip]
  const asciiPrefix = [['./fallback/latin1', (x) => latin1.asciiPrefix(x)]]

  // [name, impl, skip]
  const decodeLatin1 = [
    ['@exodus/bytes', (x) => latin1toString(x)],
    ['./fallback/latin1', (x) => latin1.decodeLatin1(x)],
    ['Buffer', (x) => toBuffer(x, Buffer).toString('latin1')],
    // ['Buffer.from', (x) => Buffer.from(x).toString('latin1')],
    ['buffer/Buffer', (x) => toBuffer(x, buffer.Buffer).toString('latin1'), bufferIsPolyfilled],
    ['toBase64 + atob', (x) => atob(x.toBase64()), !Uint8Array.prototype.toBase64 || !atob],
    // ['buffer/Buffer.from', (x) => buffer.Buffer.from(x).toString('latin1'), bufferIsPolyfilled],
    ['iconv-lite', (x) => iconv.decode(x, 'iso-8859-1')],
  ]

  // [name, impl, skip]
  const encodeLatin1 = [
    ['@exodus/bytes', (x) => latin1fromString(x)],
    ['./fallback/latin1', (x) => latin1.encodeLatin1(x)],
    ['Buffer', (x) => Buffer.from(x, 'latin1')],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'latin1'), bufferIsPolyfilled],
    ['fromBase64 + btoa', (x) => Uint8Array.fromBase64(btoa(x)), !Uint8Array.fromBase64 || !btoa],
    ['iconv-lite', (x) => iconv.encode(x, 'iso-8859-1')],
  ]

  // [name, impl, skip]
  const decodeAscii = [
    ['@exodus/bytes latin1', (x) => latin1toString(x)],
    ['./fallback/latin1', (x) => latin1.decodeAscii(x)],
    ['Buffer (ascii)', (x) => toBuffer(x, Buffer).toString('ascii')],
    ['Buffer (latin1)', (x) => toBuffer(x, Buffer).toString('latin1')],
    ['Buffer (utf8)', (x) => toBuffer(x, Buffer).toString('utf8')],
    ['TextDecoder (utf8)', (x) => textDecoder.decode(x), !textDecoder],
    ['TextDecoder (ascii)', (x) => textDecoderAscii.decode(x), !textDecoderAscii],
    ['text-encoding (windows-1252)', (x) => textDecoderJS.decode(x)],
    ['String.fromCharCode', (x) => String.fromCharCode.apply(String, x)],
    ['iconv-lite', (x) => iconv.decode(x, 'ascii')],
  ]

  // [name, impl, skip]
  const encodeAscii = [
    ['@exodus/bytes latin1', (x) => latin1fromString(x)],
    ['./fallback/latin1', (x) => latin1.encodeAscii(x, 'ERR'), !textEncoder],
    ['Buffer (ascii)', (x) => Buffer.from(x, 'ascii')],
    ['Buffer (latin1)', (x) => Buffer.from(x, 'latin1')],
    ['Buffer (utf8)', (x) => Buffer.from(x, 'utf8')],
    ['TextEncoder (utf8)', (x) => textEncoder.encode(x), !textEncoder],
    ['text-encoding (utf8)', (x) => textEncoderJS.encode(x)],
    ['iconv-lite', (x) => iconv.encode(x, 'ascii')],
  ]

  test('asciiPrefix coherence', (t) => {
    for (const [name, f, skip] of asciiPrefix) {
      if (skip) continue
      for (const x of asciiBufs) t.assert.strictEqual(f(x), x.length, name)
    }
  })

  test('asciiPrefix', { timeout }, async () => {
    for (const [name, f, skip] of asciiPrefix) {
      await benchmark(`asciiPrefix: ${name}`, { skip, args: asciiBufs }, f)
    }
  })

  test('decodeLatin1 coherence', (t) => {
    for (const [name, f, skip] of decodeLatin1) {
      if (skip) continue
      for (let i = 0; i < bufs.length; i++) t.assert.strictEqual(f(bufs[i]), strings[i], name)
    }
  })

  test('decodeLatin1', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip] of decodeLatin1) {
      res.add(name, await benchmark(`decodeLatin1: ${name}`, { skip, args: bufs }, f))
    }

    res.print(columns)
  })

  test('encodeLatin1 coherence', (t) => {
    for (const [name, f, skip] of encodeLatin1) {
      if (skip) continue
      for (let i = 0; i < bufs.length; i++) t.assert.deepEqual(f(strings[i]), bufs[i], name)
    }
  })

  test('encodeLatin1', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip] of encodeLatin1) {
      res.add(name, await benchmark(`encodeLatin1: ${name}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })

  test('decodeAscii coherence', (t) => {
    for (const [name, f, skip] of decodeAscii) {
      if (skip) continue
      for (let i = 0; i < asciiBufs.length; i++) {
        t.assert.strictEqual(f(asciiBufs[i]), asciiStrings[i], name)
      }
    }
  })

  test('decodeAscii', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip] of decodeAscii) {
      res.add(name, await benchmark(`decodeAscii: ${name}`, { skip, args: asciiBufs }, f))
    }

    res.print(columns)
  })

  test('encodeAscii coherence', (t) => {
    for (const [name, f, skip] of encodeAscii) {
      if (skip) continue
      for (let i = 0; i < asciiBufs.length; i++) {
        t.assert.deepEqual(f(asciiStrings[i]), asciiBufs[i], name)
      }
    }
  })

  test('encodeAscii', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip] of encodeAscii) {
      res.add(name, await benchmark(`encodeAscii: ${name}`, { skip, args: asciiStrings }, f))
    }

    res.print(columns)
  })
})
