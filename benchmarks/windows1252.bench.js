import * as exodus from '@exodus/bytes/single-byte.js'
import { encodingDecoder } from '../fallback/single-byte.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'
import iconv from 'iconv-lite'
import js from 'text-encoding'

import { bufs } from './utils/random.js'
import { Table } from './utils/table.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer

let strings = bufs.map((x) => exodus.windows1252toString(x))
const asciiBufs = bufs.map((x) => x.map((c) => c & 0x7f))
let asciiStrings = asciiBufs.map((x) => exodus.windows1252toString(x))

const isNative = (x) => x && (!bufferIsPolyfilled || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const { TextDecoder } = globalThis
const textDecoder = isNative(TextDecoder) ? new TextDecoder('windows-1252', { fatal: true }) : null
const textDecoderJS = new js.TextDecoder('windows-1252', { fatal: true })
const fallbackDecoder = encodingDecoder('windows-1252')

const columns = [
  '@exodus/bytes/windows1252',
  textDecoder ? 'TextDecoder' : 'text-encoding',
  'iconv-lite',
]

describe('benchmarks: windows1252', async () => {
  // [name, impl, skip]
  const windows1252toString = [
    ['@exodus/bytes/windows1252', (x) => exodus.windows1252toString(x)],
    ['fallback', (x) => fallbackDecoder(x)],
    ['TextDecoder', (x) => textDecoder.decode(x), !textDecoder],
    ['text-encoding', (x) => textDecoderJS.decode(x)],
    ['iconv-lite', (x) => iconv.decode(x, 'windows-1252', { stripBOM: false })],
  ]

  test('windows1252toString coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of windows1252toString) {
        if (skip) continue
        t.assert.deepEqual(f(asciiBufs[i]), asciiStrings[i], name)
        if (name === 'TextDecoder' && !bufferIsPolyfilled) continue // Node.js TextDecoder is broken
        let expected = strings[i]
        if (name === 'iconv-lite') {
          expected = expected.replaceAll(/[\x81\x8D\x8F\x90\x9D]/g, '\uFFFD') // iconv-lite maps them to replacement
        }

        t.assert.deepEqual(f(bufs[i]), expected, name)
      }
    }
  })

  test('windows1252toString, ascii', { timeout: 20_000 }, async (t) => {
    const res = new Table()
    for (const [name, f, skip] of windows1252toString) {
      res.add(name, await benchmark(`${t.name}: ${name}`, { skip, args: asciiBufs }, f))
    }

    res.print(columns)
  })

  test('windows1252toString, complex', { timeout: 20_000 }, async (t) => {
    const res = new Table()
    for (const [name, f, skip] of windows1252toString) {
      res.add(name, await benchmark(`${t.name}: ${name}`, { skip, args: bufs }, f))
    }

    res.print(columns)
  })

  const windows1252fromString = [
    ['@exodus/bytes/windows1252', (x) => exodus.windows1252fromString(x)],
    ['iconv-lite', (x) => iconv.encode(x, 'windows-1252', { addBOM: false })],
  ]

  test('windows1252fromString coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of windows1252fromString) {
        if (skip) continue
        t.assert.deepEqual(f(asciiStrings[i]), asciiBufs[i], name)
        if (name === 'iconv-lite') continue // mapping is invalid there
        t.assert.deepEqual(f(strings[i]), bufs[i], name)
      }
    }
  })

  test('windows1252fromString, ascii', { timeout: 20_000 }, async (t) => {
    const res = new Table()
    for (const [name, f, skip] of windows1252fromString) {
      // Prepare fresh input as internal engine state is affected by lib order otherwise
      asciiStrings = asciiBufs.map((x) => exodus.windows1252toString(x))
      res.add(name, await benchmark(`${t.name}: ${name}`, { skip, args: asciiStrings }, f))
    }

    res.print(columns)
  })

  test('windows1252fromString, complex', { timeout: 20_000 }, async (t) => {
    const res = new Table()
    for (const [name, f, skip] of windows1252fromString) {
      // Prepare fresh input as internal engine state is affected by lib order otherwise
      strings = bufs.map((x) => exodus.windows1252toString(x))
      res.add(name, await benchmark(`${t.name}: ${name}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })
})
