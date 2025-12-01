import * as exodus from '@exodus/bytes/hex.js'
import * as fallback from '../fallback/hex.js'
import * as stablelib from '@stablelib/hex'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import { hex as scure } from '@scure/base'
import buffer from 'buffer/index.js'
import * as hextreme from 'hextreme'
import { describe, test } from 'node:test'

import { bufs } from './utils/random.js'
import { Table } from './utils/table.js'

const columns = [
  '@exodus/bytes/hex',
  'scure.hex',
  'Buffer',
  '@stablelib',
  'hextreme',
  'Buffer.from',
]
const columnsOld = [
  '@exodus/bytes/hex, no native',
  'scure.hex, no native',
  'Buffer',
  '@stablelib',
  'hextreme, no native',
  'Buffer.from',
]

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffset, x.byteLength)

const timeout = 30_000
describe('benchmarks: hex', async () => {
  let hextremeJS // Fallback without Uint8Array.fromHex, Uint8Array#toHex
  let scureJS // Fallback without Uint8Array.fromHex, Uint8Array#toHex
  let exodusA // Fallback without Uint8Array.fromHex, Uint8Array#toHex
  let exodusB // Fallback without native Buffer

  const toHexNative = Uint8Array.prototype.toHex
  const fromHexNative = Uint8Array.fromHex
  const reset = []
  if (Uint8Array.fromHex || Uint8Array.prototype.toHex) {
    delete Uint8Array.fromHex
    reset.push(() => (Uint8Array.fromHex = fromHexNative))
    Uint8Array.prototype.toHex = undefined // eslint-disable-line no-extend-native
    reset.push(() => (Uint8Array.prototype.toHex = toHexNative)) // eslint-disable-line no-extend-native
    exodusA = await import('../hex.js?a') // eslint-disable-line @exodus/import/no-unresolved
    scureJS = (await import('../node_modules/@scure/base/lib/esm/index.js?a')).hex // eslint-disable-line @exodus/import/no-unresolved, unicorn/no-await-expression-member
    hextremeJS = await import('../node_modules/hextreme/index.mjs?a') // eslint-disable-line @exodus/import/no-unresolved, unicorn/no-await-expression-member
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.TYPED_ARRAY_SUPPORT = true
    reset.push(() => delete Buffer.TYPED_ARRAY_SUPPORT)
    exodusB = await import('../hex.js?b') // eslint-disable-line @exodus/import/no-unresolved
  }

  for (const f of reset) f()

  const strings = bufs.map((x) => exodus.toHex(x))

  // [name, impl, skip, removeNative]
  const toHex = [
    ['@exodus/bytes/hex', (x) => exodus.toHex(x)],
    ['@exodus/bytes/hex, no native', (x) => exodusA.toHex(x), !exodusA],
    ['@exodus/bytes/hex, no Buffer', (x) => exodusB.toHex(x), !exodusB],
    ['fallback', (x) => fallback.toHex(x)],
    ['Buffer', (x) => toBuffer(x, Buffer).toString('hex')],
    ['Buffer.from', (x) => Buffer.from(x).toString('hex')],
    ['buffer/Buffer', (x) => toBuffer(x, buffer.Buffer).toString('hex'), bufferIsPolyfilled],
    ['buffer/Buffer.from', (x) => buffer.Buffer.from(x).toString('hex'), bufferIsPolyfilled],
    ['scure.hex', (x) => scure.encode(x)],
    ['scure.hex, no native', (x) => scureJS.encode(x), !scureJS],
    ['@stablelib', (x) => stablelib.encode(x, true)],
    ['hextreme', (x) => hextreme.toHex(x)],
    ['hextreme, no native', (x) => hextremeJS.toHex(x), !hextremeJS, true], // uses TextDecoder
  ]

  // [name, impl, skip, removeNative]
  const fromHex = [
    ['@exodus/bytes/hex', (x) => exodus.fromHex(x)],
    ['@exodus/bytes/hex, no native', (x) => exodusA.fromHex(x), !exodusA],
    ['@exodus/bytes/hex, no Buffer', (x) => exodusB.fromHex(x), !exodusB],
    ['fallback', (x) => fallback.fromHex(x)],
    ['Buffer', (x) => Buffer.from(x, 'hex')],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'hex'), bufferIsPolyfilled],
    ['scure.hex', (x) => scure.decode(x)],
    ['scure.hex, no native', (x) => scureJS.decode(x), !scureJS],
    ['@stablelib', (x) => stablelib.decode(x)],
    ['hextreme', (x) => hextreme.fromHex(x)],
    ['hextreme, no native', (x) => hextremeJS.fromHex(x), !hextremeJS, true], // uses TextEncoder
  ]

  test('toHex coherence', (t) => {
    for (const [name, f, skip, removeNative] of toHex) {
      if (skip) continue
      if (removeNative) Uint8Array.prototype.toHex = undefined // eslint-disable-line no-extend-native
      try {
        for (let i = 0; i < 100; i++) t.assert.deepEqual(f(bufs[i]), strings[i], name)
      } finally {
        if (removeNative) Uint8Array.prototype.toHex = toHexNative // eslint-disable-line no-extend-native
      }
    }
  })

  test('toHex', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip, removeNative] of toHex) {
      if (removeNative) Uint8Array.prototype.toHex = undefined // eslint-disable-line no-extend-native
      res.add(name, await benchmark(`toHex: ${name}`, { skip, args: bufs }, f))
      if (removeNative) Uint8Array.prototype.toHex = toHexNative // eslint-disable-line no-extend-native
    }

    res.print(columns)
    res.print(columnsOld)
  })

  test('fromHex coherence', (t) => {
    for (const [name, f, skip, removeNative] of fromHex) {
      if (skip) continue
      if (removeNative) delete Uint8Array.fromHex // eslint-disable-line no-extend-native
      try {
        for (let i = 0; i < 100; i++) t.assert.deepEqual(f(strings[i]), bufs[i], name)
      } finally {
        if (removeNative) Uint8Array.fromHex = fromHexNative // eslint-disable-line no-extend-native
      }
    }
  })

  test('fromHex', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip, removeNative] of fromHex) {
      if (removeNative) delete Uint8Array.fromHex // eslint-disable-line no-extend-native
      res.add(name, await benchmark(`fromHex: ${name}`, { skip, args: strings }, f))
      if (removeNative) Uint8Array.fromHex = fromHexNative // eslint-disable-line no-extend-native
    }

    res.print(columns)
    res.print(columnsOld)
  })
})
