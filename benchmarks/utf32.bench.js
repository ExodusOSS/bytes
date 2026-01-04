import { utf8toStringLoose } from '@exodus/bytes/utf8.js'
import * as exodus from '../utf32.js'
import * as fallback from '../fallback/utf32.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import { describe, test } from 'node:test'
import iconv from 'iconv-lite'
import punycode from '../node_modules/punycode/punycode.es6.js'

import { bufs as bufsRaw0 } from './utils/random.js'
import { Table } from './utils/table.js'

const toUint8 = (x) => new Uint8Array(x.buffer, x.byteOffset, x.byteLength)

/* eslint-disable camelcase */

const ascii = false
const bufsRaw = ascii ? bufsRaw0.map((x) => x.map((c) => (c >= 0x80 ? c - 0x80 : c))) : bufsRaw0
if (ascii) console.warn('Warning: ASCII mode')

const replacementChar = String.fromCodePoint(0xff_fd) // We don't expect much of these in real usage, and rng will spawn a lot of those, so strip
const strings = bufsRaw.map((x) => utf8toStringLoose(x).replaceAll(replacementChar, '∀')) // loose, but we want that here
const u32 = strings.map((x) => new Uint32Array([...x].map((y) => y.codePointAt(0))))
const isLE = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2
const u8le = u32.map((x) => toUint8(isLE ? x : Buffer.from(toUint8(x)).swap32()))
const u8be = u32.map((x) => toUint8(isLE ? Buffer.from(toUint8(x)).swap32() : x))

const countCoherence = Math.min(strings.length, 100)
const timeout = 20_000

const columns = [
  '@exodus/bytes/utf32',
  '@exodus/bytes/utf32, loose',
  'punycode',
  'iconv-lite',
  'String.fromCharCode',
]

describe('benchmarks: utf32', async () => {
  // [n, impl, skip]
  const utf32toString32 = [
    ['@exodus/bytes/utf32', (x) => exodus.utf32toString(x)],
    ['@exodus/bytes/utf32, loose', (x) => exodus.utf32toStringLoose(x)],
    ['fallback', (x) => fallback.decode(x)],
    ['String.fromCodePoint.apply', (x) => String.fromCodePoint.apply(String, x)],
    ['String.fromCodePoint(...)', (x) => String.fromCodePoint(...x)],
    ['punycode', (x) => punycode.ucs2.encode(x)],
  ]

  const utf32toStringLE = [
    ['@exodus/bytes/utf32', (x) => exodus.utf32toString(x, 'uint8-le')],
    ['@exodus/bytes/utf32, loose', (x) => exodus.utf32toStringLoose(x, 'uint8-le')],
    ['iconv-lite', (x) => iconv.decode(x, 'utf-32le', { stripBOM: false })],
  ]

  const utf32toStringBE = [
    ['@exodus/bytes/utf32', (x) => exodus.utf32toString(x, 'uint8-be')],
    ['@exodus/bytes/utf32, loose', (x) => exodus.utf32toStringLoose(x, 'uint8-be')],
    ['iconv-lite', (x) => iconv.decode(x, 'utf-32be', { stripBOM: false })],
  ]

  const utf32fromString32 = [
    ['@exodus/bytes/utf32', (x) => exodus.utf32fromString(x)],
    ['@exodus/bytes/utf32, loose', (x) => exodus.utf32fromStringLoose(x)],
    ['String.codePointAt(...)', (x) => [...x].map((y) => y.codePointAt(0))],
    ['punycode', (x) => punycode.ucs2.decode(x)],
  ]

  const utf32fromStringLE = [
    ['@exodus/bytes/utf32', (x) => exodus.utf32fromString(x, 'uint8-le')],
    ['@exodus/bytes/utf32, loose', (x) => exodus.utf32fromStringLoose(x, 'uint8-le')],
    ['iconv-lite', (x) => iconv.encode(x, 'utf-32le', { addBOM: false })],
  ]

  const utf32fromStringBE = [
    ['@exodus/bytes/utf32', (x) => exodus.utf32fromString(x, 'uint8-be')],
    ['@exodus/bytes/utf32, loose', (x) => exodus.utf32fromStringLoose(x, 'uint8-be')],
    ['iconv-lite', (x) => iconv.encode(x, 'utf-32be', { addBOM: false })],
  ]

  test('utf32toString coherence, uint32', (t) => {
    for (const [n, f, skip] of utf32toString32) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.strictEqual(f(u32[i]), strings[i], n)
      }
    }
  })

  test('utf32toString, uint32', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf32toString32) {
      res.add(n, await benchmark(`utf32toString, uint32: ${n}`, { skip, args: u32 }, f))
    }

    res.print(columns)
  })

  test('utf32toString coherence, uint8-le', (t) => {
    for (const [n, f, skip] of utf32toStringLE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.strictEqual(f(u8le[i]), strings[i], n)
      }
    }
  })

  test('utf32toString, uint8-le', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf32toStringLE) {
      res.add(n, await benchmark(`utf32toString, uint8-le: ${n}`, { skip, args: u8le }, f))
    }

    res.print(columns)
  })

  test('utf32toString coherence, uint8-be', (t) => {
    for (const [n, f, skip] of utf32toStringBE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.strictEqual(f(u8be[i]), strings[i], n)
      }
    }
  })

  test('utf32toString, uint8-be', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf32toStringBE) {
      res.add(n, await benchmark(`utf32toString, uint8-be: ${n}`, { skip, args: u8be }, f))
    }

    res.print(columns)
  })

  test('utf32fromString coherence, uint32', (t) => {
    for (const [n, f, skip] of utf32fromString32) {
      for (let i = 0; i < countCoherence; i++) {
        // Casts to Uint32Array before comparison
        if (!skip) t.assert.deepStrictEqual(new Uint32Array(f(strings[i])), u32[i], n)
      }
    }
  })

  test('utf32fromString, uint32', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf32fromString32) {
      res.add(n, await benchmark(`utf32fromString, uint32: ${n}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })

  test('utf32fromString coherence, uint8-le', (t) => {
    for (const [n, f, skip] of utf32fromStringLE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.deepEqual(f(strings[i]), u8le[i], n)
      }
    }
  })

  test('utf32fromString, uint8-le', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf32fromStringLE) {
      res.add(n, await benchmark(`utf32fromString, uint8-le: ${n}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })

  test('utf32fromString coherence, uint8-be', (t) => {
    for (const [n, f, skip] of utf32fromStringBE) {
      for (let i = 0; i < countCoherence; i++) {
        if (!skip) t.assert.deepEqual(f(strings[i]), u8be[i], n)
      }
    }
  })

  test('utf32fromString, uint8-be', { timeout }, async () => {
    const res = new Table()
    for (const [n, f, skip] of utf32fromStringBE) {
      res.add(n, await benchmark(`utf32fromString, uint8-be: ${n}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })
})
