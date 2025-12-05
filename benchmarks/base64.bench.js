import * as exodus from '@exodus/bytes/base64.js'
import * as fallback from '../fallback/base64.js'
import * as stablelib from '@stablelib/base64'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import { base64 as scure } from '@scure/base'
import base64js from 'base64-js'
import fastBase64Decode from 'fast-base64-decode'
import fastBase64Encode from 'fast-base64-encode'
import buffer from 'buffer/index.js'
import * as hextreme from 'hextreme'
import * as uint8arraytools from 'uint8array-tools'
import { describe, test } from 'node:test'

import { bufs } from './utils/random.js'
import { Table } from './utils/table.js'

const columns = [
  '@exodus/bytes/base64',
  'scure.base64',
  'Buffer',
  '@stablelib',
  'base64-js',
  'fast-base64-decode',
  'fast-base64-encode',
  'hextreme',
  'Buffer.from',
  'uint8array-tools',
]
const columnsOld = [
  '@exodus/bytes/base64, no native',
  'scure.base64, no native',
  'Buffer',
  '@stablelib',
  'base64-js',
  'fast-base64-decode',
  'fast-base64-encode',
  'hextreme, no native',
  'Buffer.from',
  'uint8array-tools',
]

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffset, x.byteLength)

const timeout = 30_000
describe('benchmarks: base64', async () => {
  let hextremeJS // Fallback without Uint8Array.fromBase64, Uint8Array#toBase64
  let scureJS // Fallback without Uint8Array.fromBase64, Uint8Array#toBase64
  let exodusA // Fallback without Uint8Array.fromBase64, Uint8Array#toBase64
  let exodusB // Fallback without native Buffer
  let exodusC // Fallback without atob

  const toBase64Native = Uint8Array.prototype.toBase64
  const fromBase64Native = Uint8Array.fromBase64
  const reset = []
  if (Uint8Array.fromBase64 || Uint8Array.prototype.toBase64) {
    delete Uint8Array.fromBase64
    reset.push(() => (Uint8Array.fromBase64 = fromBase64Native))
    Uint8Array.prototype.toBase64 = undefined // eslint-disable-line no-extend-native
    reset.push(() => (Uint8Array.prototype.toBase64 = toBase64Native)) // eslint-disable-line no-extend-native
    exodusA = await import('../base64.js?a') // eslint-disable-line @exodus/import/no-unresolved
    scureJS = (await import('../node_modules/@scure/base/lib/esm/index.js?a')).base64 // eslint-disable-line @exodus/import/no-unresolved, unicorn/no-await-expression-member
    hextremeJS = await import('../node_modules/hextreme/index.mjs?a') // eslint-disable-line @exodus/import/no-unresolved, unicorn/no-await-expression-member
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.TYPED_ARRAY_SUPPORT = true
    reset.push(() => delete Buffer.TYPED_ARRAY_SUPPORT)
    exodusB = await import('../base64.js?b') // eslint-disable-line @exodus/import/no-unresolved
  }

  if (globalThis.atob && globalThis.btoa && globalThis.HermesInternal) {
    const { atob, btoa } = globalThis
    delete globalThis.atob
    delete globalThis.btoa
    exodusC = await import('../base64.js?c') // eslint-disable-line @exodus/import/no-unresolved
    Object.assign(globalThis, { atob, btoa })
  }

  for (const f of reset) f()

  const strings = bufs.map((x) => (x.toBase64 ? x.toBase64() : exodus.toBase64(x)))

  // [name, impl, skip, removeNative]
  const toBase64 = [
    ['@exodus/bytes/base64', (x) => exodus.toBase64(x)],
    ['@exodus/bytes/base64, no native', (x) => exodusA.toBase64(x), !exodusA],
    ['@exodus/bytes/base64, no Buffer', (x) => exodusB.toBase64(x), !exodusB],
    ['@exodus/bytes/base64, no btoa', (x) => exodusC.toBase64(x), !exodusC],
    ['fallback', (x) => fallback.toBase64(x, false, true)],
    ['Buffer', (x) => toBuffer(x, Buffer).toString('base64')],
    ['Buffer.from', (x) => Buffer.from(x).toString('base64')],
    ['buffer/Buffer', (x) => toBuffer(x, buffer.Buffer).toString('base64'), bufferIsPolyfilled],
    ['buffer/Buffer.from', (x) => buffer.Buffer.from(x).toString('base64'), bufferIsPolyfilled],
    ['fast-base64-encode', (x) => fastBase64Encode(x)],
    ['base64-js', (x) => base64js.fromByteArray(x)],
    ['scure.base64', (x) => scure.encode(x)],
    ['scure.base64, no native', (x) => scureJS.encode(x), !scureJS],
    ['@stablelib', (x) => stablelib.encode(x)],
    ['hextreme', (x) => hextreme.toBase64(x)],
    ['hextreme, no native', (x) => hextremeJS.toBase64(x), !hextremeJS, true], // uses TextDecoder
    ['uint8array-tools', (x) => uint8arraytools.toBase64(x)],
  ]

  // [name, impl, skip, removeNative]
  const fromBase64 = [
    ['@exodus/bytes/base64', (x) => exodus.fromBase64(x)],
    ['@exodus/bytes/base64, no native', (x) => exodusA.fromBase64(x), !exodusA],
    ['@exodus/bytes/base64, no Buffer', (x) => exodusB.fromBase64(x), !exodusB],
    ['@exodus/bytes/base64, no atob', (x) => exodusC.fromBase64(x), !exodusC],
    // ['@exodus/bytes/base64, any mode', (x) => exodus.fromBase64any(x)],
    ['fallback', (x) => fallback.fromBase64(x)],
    ['Buffer', (x) => Buffer.from(x, 'base64')],
    ['buffer/Buffer', (x) => buffer.Buffer.from(x, 'base64'), bufferIsPolyfilled],
    [
      'fast-base64-decode',
      (x) => {
        let len = x.length
        while (x[len - 1] === '=') len-- // not significant for perf anyway
        const arr = new Uint8Array(Math.floor((len * 3) / 4))
        fastBase64Decode(x, arr)
        return arr
      },
    ],
    ['base64-js', (x) => base64js.toByteArray(x)],
    ['scure.base64', (x) => scure.decode(x)],
    ['scure.base64, no native', (x) => scureJS.decode(x), !scureJS],
    ['@stablelib', (x) => stablelib.decode(x)],
    ['hextreme', (x) => hextreme.fromBase64(x)],
    ['hextreme, no native', (x) => hextremeJS.fromBase64(x), !hextremeJS, true], // uses TextEncoder
    ['uint8array-tools', (x) => uint8arraytools.fromBase64(x)],
  ]

  test('toBase64 coherence', (t) => {
    for (const [name, f, skip, removeNative] of toBase64) {
      if (skip) continue
      if (removeNative) Uint8Array.prototype.toBase64 = undefined // eslint-disable-line no-extend-native
      try {
        for (let i = 0; i < 100; i++) t.assert.deepEqual(f(bufs[i]), strings[i], name)
      } finally {
        if (removeNative) Uint8Array.prototype.toBase64 = toBase64Native // eslint-disable-line no-extend-native
      }
    }
  })

  test('toBase64', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip, removeNative] of toBase64) {
      if (removeNative) Uint8Array.prototype.toBase64 = undefined // eslint-disable-line no-extend-native
      res.add(name, await benchmark(`toBase64: ${name}`, { skip, args: bufs }, f))
      if (removeNative) Uint8Array.prototype.toBase64 = toBase64Native // eslint-disable-line no-extend-native
    }

    res.print(columns)
    res.print(columnsOld)
  })

  test('fromBase64 coherence', (t) => {
    for (const [name, f, skip, removeNative] of fromBase64) {
      if (skip) continue
      if (removeNative) delete Uint8Array.fromBase64 // eslint-disable-line no-extend-native
      try {
        for (let i = 0; i < 100; i++) t.assert.deepEqual(f(strings[i]), bufs[i], name)
      } finally {
        if (removeNative) Uint8Array.fromBase64 = fromBase64Native // eslint-disable-line no-extend-native
      }
    }
  })

  test('fromBase64', { timeout }, async () => {
    const res = new Table()
    for (const [name, f, skip, removeNative] of fromBase64) {
      if (removeNative) delete Uint8Array.fromBase64 // eslint-disable-line no-extend-native
      res.add(name, await benchmark(`fromBase64: ${name}`, { skip, args: strings }, f))
      if (removeNative) Uint8Array.fromBase64 = fromBase64Native // eslint-disable-line no-extend-native
    }

    res.print(columns)
    res.print(columnsOld)
  })
})
