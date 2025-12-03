import { utf8fromString } from '@exodus/bytes/utf8.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'

import { bufs as bufsRaw } from './utils/random.js'
import * as latin1 from '../fallback/latin1.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffset, x.byteLength)

const replacementChar = String.fromCodePoint(0xff_fd) // We don't expect much of these in real usage, and rng will spawn a lot of those, so strip
const strings = bufsRaw.map((x) => Buffer.from(x).toString().replaceAll(replacementChar, '∀')) // loose, but we want that here
const bufs = strings.map((x) => utf8fromString(x))
const latin = bufs.map((x) => Buffer.from(x).toString('latin1'))

const asciiBufs = bufsRaw.map((x) => x.map((c) => (c >= 0x80 ? c - 0x80 : c)))
const asciiStrings = asciiBufs.map((x) => Buffer.from(x).toString())

const isNative = (x) => x && (!bufferIsPolyfilled || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const { TextEncoder, TextDecoder, btoa } = globalThis
const textEncoder = isNative(TextEncoder) ? new TextEncoder() : null
const textDecoder = isNative(TextDecoder) ? new TextDecoder() : null
const textDecoderAscii = isNative(TextDecoder) ? new TextDecoder('ascii') : null

const timeout = 30_000
describe('benchmarks: latin1', async () => {
  // [name, impl, skip]
  const asciiPrefix = [['./fallback/latin1', (x) => latin1.asciiPrefix(x)]]

  // [name, impl, skip]
  const decodeLatin1 = [
    ['./fallback/latin1', (x) => latin1.decodeLatin1(x)],
    ['Buffer', (x) => toBuffer(x, Buffer).toString('latin1')],
    // ['Buffer.from', (x) => Buffer.from(x).toString('latin1')],
    ['buffer/Buffer', (x) => toBuffer(x, buffer.Buffer).toString('latin1'), bufferIsPolyfilled],
    // ['buffer/Buffer.from', (x) => buffer.Buffer.from(x).toString('latin1'), bufferIsPolyfilled],
  ]

  // [name, impl, skip]
  const encodeLatin1 = [
    ['./fallback/latin1', (x) => latin1.encodeLatin1(x)],
    ['Buffer', (x) => Buffer.from(x, 'latin1')],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'latin1'), bufferIsPolyfilled],
    ['fromBase64 + btoa', (x) => Uint8Array.fromBase64(btoa(x)), !Uint8Array.fromBase64 || !btoa],
  ]

  // [name, impl, skip]
  const decodeAscii = [
    ['./fallback/latin1', (x) => latin1.decodeAscii(x)],
    ['Buffer (ascii)', (x) => toBuffer(x, Buffer).toString('ascii')],
    ['Buffer (latin1)', (x) => toBuffer(x, Buffer).toString('latin1')],
    ['Buffer (utf8)', (x) => toBuffer(x, Buffer).toString('utf8')],
    ['TextDecoder', (x) => textDecoder.decode(x), !textDecoder],
    ['TextDecoder (ascii)', (x) => textDecoderAscii.decode(x), !textDecoderAscii],
    ['String.fromCharCode', (x) => String.fromCharCode.apply(String, x)],
  ]

  // [name, impl, skip]
  const encodeAscii = [
    ['./fallback/latin1', (x) => latin1.encodeAscii(x, 'ERR'), !textEncoder],
    ['Buffer (ascii)', (x) => Buffer.from(x, 'ascii')],
    ['Buffer (latin1)', (x) => Buffer.from(x, 'latin1')],
    ['Buffer (utf8)', (x) => Buffer.from(x, 'utf8')],
    ['TextEncoder', (x) => textEncoder.encode(x), !textEncoder],
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
      for (let i = 0; i < bufs.length; i++) t.assert.strictEqual(f(bufs[i]), latin[i], name)
    }
  })

  test('decodeLatin1', { timeout }, async () => {
    for (const [name, f, skip] of decodeLatin1) {
      await benchmark(`decodeLatin1: ${name}`, { skip, args: bufs }, f)
    }
  })

  test('encodeLatin1 coherence', (t) => {
    for (const [name, f, skip] of encodeLatin1) {
      if (skip) continue
      for (let i = 0; i < bufs.length; i++) t.assert.deepEqual(f(latin[i]), bufs[i], name)
    }
  })

  test('encodeLatin1', { timeout }, async () => {
    for (const [name, f, skip] of encodeLatin1) {
      await benchmark(`encodeLatin1: ${name}`, { skip, args: latin }, f)
    }
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
    for (const [name, f, skip] of decodeAscii) {
      await benchmark(`decodeAscii: ${name}`, { skip, args: asciiBufs }, f)
    }
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
    for (const [name, f, skip] of encodeAscii) {
      await benchmark(`encodeAscii: ${name}`, { skip, args: asciiStrings }, f)
    }
  })
})
