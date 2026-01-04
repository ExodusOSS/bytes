import { utf8toStringLoose } from '@exodus/bytes/utf8.js'
import * as exodus from '@exodus/bytes/utf16.js'
import * as fallback from '../fallback/utf16.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'
import iconv from 'iconv-lite'
import js from 'text-encoding'

import { bufs as bufsRaw0 } from './utils/random.js'
import { Table } from './utils/table.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffset, x.byteLength)
const toUint8 = (x) => new Uint8Array(x.buffer, x.byteOffset, x.byteLength)
const toUint16 = (x) => new Uint16Array(x.buffer, x.byteOffset, x.byteLength / 2)

/* eslint-disable camelcase */

const ascii = false
const bufsRaw = ascii ? bufsRaw0.map((x) => x.map((c) => (c >= 0x80 ? c - 0x80 : c))) : bufsRaw0
if (ascii) console.warn('Warning: ASCII mode')

const isNative = (x) => x && (!bufferIsPolyfilled || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const { TextDecoder } = globalThis
const textDecoderLE = isNative(TextDecoder) ? new TextDecoder('utf-16le', { fatal: true }) : null
const textDecoderLE_Loose = isNative(TextDecoder) ? new TextDecoder('utf-16le') : null
const textDecoderLE_JS = new js.TextDecoder('utf-16le', { fatal: true })
const textDecoderLE_JSLoose = new js.TextDecoder('utf-16le')
const textDecoderBE = isNative(TextDecoder) ? new TextDecoder('utf-16be', { fatal: true }) : null
const textDecoderBE_Loose = isNative(TextDecoder) ? new TextDecoder('utf-16be') : null
const textDecoderBE_JS = new js.TextDecoder('utf-16be', { fatal: true })
const textDecoderBE_JSLoose = new js.TextDecoder('utf-16be')

const replacementChar = String.fromCodePoint(0xff_fd) // We don't expect much of these in real usage, and rng will spawn a lot of those, so strip
const strings = bufsRaw.map((x) => utf8toStringLoose(x).replaceAll(replacementChar, '∀')) // loose, but we want that here
const u8le = strings.map((x) => toUint8(Buffer.from(x, 'utf16le')))
const u8be = u8le.map((x) => toUint8(Buffer.from(x).swap16()))
const isLE = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2
const u16 = (isLE ? u8le : u8be).map((x) => toUint16(x))

const countCoherence = 100
const timeout = 20_000

const columns = [
  '@exodus/bytes/utf16',
  '@exodus/bytes/utf16, loose',
  isNative(TextDecoder) ? 'TextDecoder' : 'text-encoding',
  isNative(TextDecoder) ? 'TextDecoder (loose)' : 'text-encoding (loose)',
  'Buffer',
  'iconv-lite',
  'String.fromCharCode',
]

describe('benchmarks: utf16', async () => {
  // [n, impl, skip]
  const utf16toString16 = [
    ['@exodus/bytes/utf16', (x) => exodus.utf16toString(x)],
    ['@exodus/bytes/utf16, loose', (x) => exodus.utf16toStringLoose(x)],
    ['fallback', (x) => fallback.decode(x)],
    ['String.fromCharCode', (x) => String.fromCharCode.apply(String, x)],
  ]

  const utf16toStringLE = [
    ['@exodus/bytes/utf16', (x) => exodus.utf16toString(x, 'uint8-le')],
    ['@exodus/bytes/utf16, loose', (x) => exodus.utf16toStringLoose(x, 'uint8-le')],
    ['Buffer', (x) => toBuffer(x, Buffer).toString('utf16le')],
    ['buffer/Buffer', (x) => toBuffer(x, buffer.Buffer).toString('utf16le'), bufferIsPolyfilled],
    ['TextDecoder', (x) => textDecoderLE.decode(x), !textDecoderLE],
    ['TextDecoder (loose)', (x) => textDecoderLE_Loose.decode(x), !textDecoderLE_Loose],
    ['text-encoding', (x) => textDecoderLE_JS.decode(x)],
    ['text-encoding (loose)', (x) => textDecoderLE_JSLoose.decode(x)],
    ['iconv-lite', (x) => iconv.decode(x, 'utf-16le', { stripBOM: false })],
  ]

  const utf16toStringBE = [
    ['@exodus/bytes/utf16', (x) => exodus.utf16toString(x, 'uint8-be')],
    ['@exodus/bytes/utf16, loose', (x) => exodus.utf16toStringLoose(x, 'uint8-be')],
    ['Buffer', (x) => Buffer.from(x).swap16().toString('utf16le')],
    [
      'buffer/Buffer',
      (x) => buffer.Buffer.from(x).swap16().toString('utf16le'),
      bufferIsPolyfilled,
    ],
    ['TextDecoder', (x) => textDecoderBE.decode(x), !textDecoderBE],
    ['TextDecoder (loose)', (x) => textDecoderBE_Loose.decode(x), !textDecoderBE_Loose],
    ['text-encoding', (x) => textDecoderBE_JS.decode(x)],
    ['text-encoding (loose)', (x) => textDecoderBE_JSLoose.decode(x)],
    ['iconv-lite', (x) => iconv.decode(x, 'utf-16be', { stripBOM: false })],
  ]

  const utf16fromString16 = [
    ['@exodus/bytes/utf16', (x) => exodus.utf16fromString(x)],
    ['@exodus/bytes/utf16, loose', (x) => exodus.utf16fromStringLoose(x)],
    ['fallback', (x) => fallback.encode(x)],
  ]

  const utf16fromStringLE = [
    ['@exodus/bytes/utf16', (x) => exodus.utf16fromString(x, 'uint8-le')],
    ['@exodus/bytes/utf16, loose', (x) => exodus.utf16fromStringLoose(x, 'uint8-le')],
    ['Buffer', (x) => Buffer.from(x, 'utf16le')],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'utf16le'), bufferIsPolyfilled],
    ['iconv-lite', (x) => iconv.encode(x, 'utf-16le', { addBOM: false })],
  ]

  const utf16fromStringBE = [
    ['@exodus/bytes/utf16', (x) => exodus.utf16fromString(x, 'uint8-be')],
    ['@exodus/bytes/utf16, loose', (x) => exodus.utf16fromStringLoose(x, 'uint8-be')],
    ['Buffer', (x) => Buffer.from(x, 'utf16le').swap16()],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'utf16le').swap16(), bufferIsPolyfilled],
    ['iconv-lite', (x) => iconv.encode(x, 'utf-16be', { addBOM: false })],
  ]

  test('to16input', async (t) => {
    await benchmark(t.name, { args: u8be }, (x) => fallback.to16input(x, !isLE))
  })

  test('utf16toString coherence, uint16', (t) => {
    for (const [n, f, skip] of utf16toString16) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.strictEqual(f(u16[i]), strings[i], n)
      }
    }
  })

  test('utf16toString, uint16', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf16toString16) {
      res.add(n, await benchmark(`utf16toString, uint16: ${n}`, { skip, args: u16 }, f))
    }

    res.print(columns)
  })

  test('utf16toString coherence, uint8-le', (t) => {
    for (const [n, f, skip] of utf16toStringLE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.strictEqual(f(u8le[i]), strings[i], n)
      }
    }
  })

  test('utf16toString, uint8-le', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf16toStringLE) {
      res.add(n, await benchmark(`utf16toString, uint8-le: ${n}`, { skip, args: u8le }, f))
    }

    res.print(columns)
  })

  test('utf16toString coherence, uint8-be', (t) => {
    for (const [n, f, skip] of utf16toStringBE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.strictEqual(f(u8be[i]), strings[i], n)
      }
    }
  })

  test('utf16toString, uint8-be', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf16toStringBE) {
      res.add(n, await benchmark(`utf16toString, uint8-be: ${n}`, { skip, args: u8be }, f))
    }

    res.print(columns)
  })

  test('utf16fromString coherence, uint16', (t) => {
    for (const [n, f, skip] of utf16fromString16) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.deepEqual(f(strings[i]), u16[i], n)
      }
    }
  })

  test('utf16fromString, uint16', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf16fromString16) {
      res.add(n, await benchmark(`utf16fromString, uint16: ${n}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })

  test('utf16fromString coherence, uint8-le', (t) => {
    for (const [n, f, skip] of utf16fromStringLE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.deepEqual(f(strings[i]), u8le[i], n)
      }
    }
  })

  test('utf16fromString, uint8-le', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf16fromStringLE) {
      res.add(n, await benchmark(`utf16fromString, uint8-le: ${n}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })

  test('utf16fromString coherence, uint8-be', (t) => {
    for (const [n, f, skip] of utf16fromStringBE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.deepEqual(f(strings[i]), u8be[i], n)
      }
    }
  })

  test('utf16fromString, uint8-be', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf16fromStringBE) {
      res.add(n, await benchmark(`utf16fromString, uint8-be: ${n}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })

  test('fallback.isWellFormed', { timeout }, async () => {
    await benchmark('fallback.isWellFormed', { args: u16 }, fallback.isWellFormed)
  })
})
