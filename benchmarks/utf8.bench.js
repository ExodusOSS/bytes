import * as exodus from '@exodus/bytes/utf8.js'
import * as fallback from '../fallback/utf8.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'
import iconv from 'iconv-lite'
import js from 'text-encoding'
import * as ethers from '@ethersproject/strings'
import * as uint8arraytools from 'uint8array-tools'
import encodeutf8 from 'encode-utf8'
import decodeutf8 from 'decode-utf8'
// import utf8js from 'utf8'

import { bufs as bufsRaw } from './utils/random.js'
import { Table } from './utils/table.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffset, x.byteLength)

const replacementChar = String.fromCodePoint(0xff_fd) // We don't expect much of these in real usage, and rng will spawn a lot of those, so strip
const strings = bufsRaw.map((x) => toBuffer(x, Buffer).toString().replaceAll(replacementChar, '∀')) // loose, but we want that here
const bufs = strings.map((x) => exodus.utf8fromString(x))

const asciiBufs = bufsRaw.map((x) => x.map((c) => (c >= 0x80 ? c - 0x80 : c)))
const asciiStrings = asciiBufs.map((x) => toBuffer(x, Buffer).toString())

const isNative = (x) => x && (!bufferIsPolyfilled || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const { TextEncoder, TextDecoder } = globalThis
const textDecoder = isNative(TextDecoder) ? new TextDecoder('utf8', { fatal: true }) : null
const textDecoderLoose = isNative(TextDecoder) ? new TextDecoder() : null
const textEncoder = isNative(TextEncoder) ? new TextEncoder() : null
const textDecoderJS = new js.TextDecoder('utf8', { fatal: true })
const textDecoderJSLoose = new js.TextDecoder()
const textEncoderJS = new js.TextEncoder()

const columnsTo = [
  '@exodus/bytes/utf8',
  '@exodus/bytes/utf8, loose',
  'Buffer',
  textDecoder ? 'TextDecoder' : 'text-encoding',
  textDecoderLoose ? 'TextDecoder (loose)' : 'text-encoding (loose)',
  'iconv-lite',
  '@ethersproject/strings',
  'uint8array-tools',
  'Buffer.from',
]

const columnsFrom = [
  '@exodus/bytes/utf8',
  '@exodus/bytes/utf8, loose',
  'Buffer',
  textEncoder ? 'TextEncoder' : 'text-encoding',
  'iconv-lite',
  '@ethersproject/strings',
  'uint8array-tools',
]

describe('benchmarks: utf8', async () => {
  // [name, impl, skip]
  const utf8toString = [
    ['@exodus/bytes/utf8', (x) => exodus.utf8toString(x)],
    ['@exodus/bytes/utf8, loose', (x) => exodus.utf8toStringLoose(x)],
    ['fallback', (x) => fallback.decode(x, true, 0)],
    ['TextDecoder', (x) => textDecoder.decode(x), !textDecoder],
    ['TextDecoder (loose)', (x) => textDecoderLoose.decode(x), !textDecoderLoose],
    ['text-encoding', (x) => textDecoderJS.decode(x)],
    ['text-encoding (loose)', (x) => textDecoderJSLoose.decode(x)],
    ['Buffer', (x) => toBuffer(x, Buffer).toString('utf8')],
    ['Buffer.from', (x) => Buffer.from(x).toString('utf8')],
    ['buffer/Buffer', (x) => toBuffer(x, buffer.Buffer).toString('utf8'), bufferIsPolyfilled],
    ['buffer/Buffer.from', (x) => buffer.Buffer.from(x).toString('utf8'), bufferIsPolyfilled],
    ['iconv-lite', (x) => iconv.decode(x, 'utf8', { stripBOM: false })],
    ['@ethersproject/strings', (x) => ethers.toUtf8String(x)],
    ['uint8array-tools', (x) => uint8arraytools.toUtf8(x)],
    ['decode-utf8', (x) => decodeutf8(x)],
    // ['utf8.js', (x) => utf8js.decode(String.fromCharCode.apply(String, x))], // needs extra steps for uint8arr
  ]

  // [name, impl, skip]
  const utf8fromString = [
    ['@exodus/bytes/utf8', (x) => exodus.utf8fromString(x)],
    ['@exodus/bytes/utf8, loose', (x) => exodus.utf8fromStringLoose(x)],
    ['fallback', (x) => fallback.encode(x, true)],
    ['TextEncoder', (x) => textEncoder.encode(x), !textEncoder],
    ['text-encoding', (x) => textEncoderJS.encode(x)],
    ['Buffer', (x) => Buffer.from(x, 'utf8')],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'utf8'), bufferIsPolyfilled],
    ['iconv-lite', (x) => iconv.encode(x, 'utf8')],
    ['@ethersproject/strings', (x) => ethers.toUtf8Bytes(x)],
    ['uint8array-tools', (x) => uint8arraytools.fromUtf8(x)],
    ['encode-utf8', (x) => new Uint8Array(encodeutf8(x))],
    // ['utf8.js', (x) => utf8js.encode(x)], // return type differs
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

  test('utf8toString, ascii', { timeout: 20_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of utf8toString) {
      res.add(name, await benchmark(`utf8toString, ascii: ${name}`, { skip, args: asciiBufs }, f))
    }

    res.print(columnsTo)
  })

  test('utf8toString, complex', { timeout: 20_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of utf8toString) {
      res.add(name, await benchmark(`utf8toString, complex: ${name}`, { skip, args: bufs }, f))
    }

    res.print(columnsTo)
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

  test('utf8fromString, ascii', { timeout: 20_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of utf8fromString) {
      res.add(
        name,
        await benchmark(`utf8fromString, ascii: ${name}`, { skip, args: asciiStrings }, f)
      )
    }

    res.print(columnsFrom)
  })

  test('utf8fromString, complex', { timeout: 20_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of utf8fromString) {
      res.add(name, await benchmark(`utf8fromString, complex: ${name}`, { skip, args: strings }, f))
    }

    res.print(columnsFrom)
  })
})
