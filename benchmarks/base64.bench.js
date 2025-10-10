import * as exodus from '@exodus/bytes/base64.js'
import * as fallback from '../fallback/base64.js'
import * as stablelib from '@stablelib/base64'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import { base64 as scure } from '@scure/base'
import base64js from 'base64-js'
import fastBase64Decode from 'fast-base64-decode'
import fastBase64Encode from 'fast-base64-encode'
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'

import { bufs } from './utils/random.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const bufferIsPolyfilled = Buffer === buffer.Buffer
const toBuffer = (x, B) => B.from(x.buffer, x.byteOffset, x.byteLength)

describe('benchmarks: base64', async () => {
  let scureJS // Fallback without Uint8Array.fromBase64, Uint8Array#toBase64
  let exodusA // Fallback without Uint8Array.fromBase64, Uint8Array#toBase64
  let exodusB // Fallback without native Buffer
  let exodusC // Fallback without atob

  const reset = []
  if (Uint8Array.fromBase64 || Uint8Array.prototype.toBase64) {
    const { fromBase64 } = Uint8Array
    delete Uint8Array.fromBase64
    reset.push(() => (Uint8Array.fromBase64 = fromBase64))
    const { toBase64 } = Uint8Array.prototype
    Uint8Array.prototype.toBase64 = undefined // eslint-disable-line no-extend-native
    reset.push(() => (Uint8Array.prototype.toBase64 = toBase64)) // eslint-disable-line no-extend-native
    exodusA = await import('../base64.js?a') // eslint-disable-line @exodus/import/no-unresolved
    scureJS = (await import('../node_modules/@scure/base/lib/esm/index.js?a')).base64 // eslint-disable-line @exodus/import/no-unresolved, unicorn/no-await-expression-member
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.TYPED_ARRAY_SUPPORT = true
    reset.push(() => delete delete Buffer.TYPED_ARRAY_SUPPORT)
    exodusB = await import('../base64.js?b') // eslint-disable-line @exodus/import/no-unresolved
  }

  if (globalThis.atob && globalThis.HermesInternal) {
    const { atob } = globalThis
    delete globalThis.atob
    exodusC = await import('../base64.js?c') // eslint-disable-line @exodus/import/no-unresolved
    globalThis.atob = atob
  }

  for (const f of reset) f()

  const strings = bufs.map((x) => exodus.toBase64(x))

  // [name, impl, skip]
  const toBase64 = [
    ['@exodus/bytes/base64', (x) => exodus.toBase64(x)],
    ['@exodus/bytes/base64, no native', (x) => exodusA.toBase64(x), !exodusA],
    ['@exodus/bytes/base64, no Buffer', (x) => exodusB.toBase64(x), !exodusB],
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
  ]

  // [name, impl, skip]
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
  ]

  test('toBase64 coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of toBase64) {
        if (!skip) t.assert.deepEqual(f(bufs[i]), strings[i], name)
      }
    }
  })

  test('toBase64', { timeout: 20_000 }, async () => {
    for (const [name, f, skip] of toBase64) {
      await benchmark(`toBase64: ${name}`, { skip, args: bufs }, f)
    }
  })

  test('fromBase64 coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of fromBase64) {
        if (!skip) t.assert.deepEqual(f(strings[i]), bufs[i], name)
      }
    }
  })

  test('fromBase64', { timeout: 20_000 }, async () => {
    for (const [name, f, skip] of fromBase64) {
      await benchmark(`fromBase64: ${name}`, { skip, args: strings }, f)
    }
  })
})
