import * as exodus from '@exodus/bytes/utf8.js'
import * as fallback from '../fallback/utf8.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'
import js from 'text-encoding'

import { bufs as bufsRaw } from './utils/random.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffet, x.byteLength)

const replacementChar = String.fromCodePoint(0xff_fd) // We don't expect much of these in real usage, and rng will spawn a lot of those, so strip
const strings = bufsRaw.map((x) => Buffer.from(x).toString().replaceAll(replacementChar, '∀')) // loose, but we want that here
const bufs = strings.map((x) => exodus.utf8fromString(x))

const asciiBufs = bufsRaw.map((x) => x.map((c) => (c >= 0x80 ? c - 0x80 : c)))
const asciiStrings = asciiBufs.map((x) => Buffer.from(x).toString())

const isNative = (x) => x && (!bufferIsPolyfilled || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const { TextEncoder, TextDecoder } = globalThis
const textDecoder = isNative(TextDecoder) ? new TextDecoder() : null
const textEncoder = isNative(TextEncoder) ? new TextEncoder() : null
const textDecoderJS = new js.TextDecoder()
const textEncoderJS = new js.TextEncoder()

describe('benchmarks: utf8', async () => {
  // [name, impl, skip]
  const utf8toString = [
    ['@exodus/bytes/utf8', (x) => exodus.utf8toString(x)],
    ['fallback', (x) => fallback.decode(x, true)],
    ['TextDecoder', (x) => textDecoder.decode(x), !textDecoder],
    ['text-encoding', (x) => textDecoderJS.decode(x)],
    ['Buffer', (x) => toBuffer(x, Buffer).toString('utf8')],
    ['Buffer.from', (x) => Buffer.from(x).toString('utf8')],
    ['buffer/Buffer', (x) => toBuffer(x, buffer.Buffer).toString('utf8'), bufferIsPolyfilled],
    ['buffer/Buffer.from', (x) => buffer.Buffer.from(x).toString('utf8'), bufferIsPolyfilled],
  ]

  // [name, impl, skip]
  const utf8fromString = [
    ['@exodus/bytes/utf8', (x) => exodus.utf8fromString(x)],
    ['fallback', (x) => fallback.encode(x, true)],
    ['TextEncoder', (x) => textEncoder.encode(x), !textEncoder],
    ['text-encoding', (x) => textEncoderJS.encode(x)],
    ['Buffer', (x) => Buffer.from(x, 'utf8')],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'utf8'), bufferIsPolyfilled],
  ]

  test('utf8toString coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of utf8toString) {
        if (!skip) t.assert.deepEqual(f(asciiBufs[i]), asciiStrings[i], name)
        if (name.startsWith('buffer/') || (name.includes('Buffer') && bufferIsPolyfilled)) continue // https://npmjs.com/buffer is broken
        if (!skip) t.assert.deepEqual(f(bufs[i]), strings[i], name)
      }
    }
  })

  test('utf8toString, ascii', { timeout: 10_000 }, async () => {
    for (const [name, f, skip] of utf8toString) {
      await benchmark(`utf8toString, ascii: ${name}`, { skip, args: asciiBufs }, f)
    }
  })

  test('utf8toString, complex', { timeout: 10_000 }, async () => {
    for (const [name, f, skip] of utf8toString) {
      await benchmark(`utf8toString, complex: ${name}`, { skip, args: bufs }, f)
    }
  })

  test('utf8fromString coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of utf8fromString) {
        if (!skip) t.assert.deepEqual(f(asciiStrings[i]), asciiBufs[i], name)
        if (name.startsWith('buffer/') || (name.includes('Buffer') && bufferIsPolyfilled)) continue // https://npmjs.com/buffer is broken
        if (!skip) t.assert.deepEqual(f(strings[i]), bufs[i], name)
      }
    }
  })

  test('utf8fromString, ascii', { timeout: 10_000 }, async () => {
    for (const [name, f, skip] of utf8fromString) {
      await benchmark(`utf8fromString, ascii: ${name}`, { skip, args: asciiStrings }, f)
    }
  })

  test('utf8fromString, complex', { timeout: 10_000 }, async () => {
    for (const [name, f, skip] of utf8fromString) {
      await benchmark(`utf8fromString, complex: ${name}`, { skip, args: strings }, f)
    }
  })
})
