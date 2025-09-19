import * as exodus from '@exodus/bytes/hex.js'
import { benchmark } from '@exodus/test/benchmark'
import { hex as scure } from '@scure/base'
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'

import { bufs } from './utils/random.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer

describe('benchmarks: hex', async () => {
  let scureJS // Fallback without Uint8Array.fromHex, Uint8Array#toHex
  let exodusA // Fallback without Uint8Array.fromHex, Uint8Array#toHex
  let exodusB // Fallback without native Buffer

  const reset = []
  if (Uint8Array.fromHex || Uint8Array.prototype.toHex) {
    const { fromHex } = Uint8Array
    delete Uint8Array.fromHex
    reset.push(() => (Uint8Array.fromHex = fromHex))
    const { toHex } = Uint8Array.prototype
    Uint8Array.prototype.toHex = undefined
    reset.push(() => (Uint8Array.prototype.toHex = toHex))
    exodusA = await import('../hex.js?a') // eslint-disable-line @exodus/import/no-unresolved
    scureJS = (await import('@scure/base?a')).hex // eslint-disable-line @exodus/import/no-unresolved
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.TYPED_ARRAY_SUPPORT = true
    reset.push(() => delete delete Buffer.TYPED_ARRAY_SUPPORT)
    exodusB = await import('../hex.js?b') // eslint-disable-line @exodus/import/no-unresolved
  }

  for (const f of reset) f()

  const strings = bufs.map((x) => exodus.toHex(x))

  // [name, impl, skip]
  const toBuf = (x, B) => B.from(x.buffer, x.byteOffet, x.byteLength)
  const toHex = [
    ['@exodus/bytes/hex', (x) => exodus.toHex(x)],
    ['@exodus/bytes/hex, no native', (x) => exodusA.toHex(x), !exodusA],
    ['@exodus/bytes/hex, no Buffer', (x) => exodusB.toHex(x), !exodusB],
    ['Buffer', (x) => toBuf(x, Buffer).toString('hex')],
    ['Buffer.from', (x) => Buffer.from(x).toString('hex')],
    ['buffer/Buffer', (x) => toBuf(x, buffer.Buffer).toString('hex'), Buffer === buffer.Buffer],
    ['buffer/Buffer.from', (x) => buffer.Buffer.from(x).toString('hex'), Buffer === buffer.Buffer],
    ['scure.hex', (x) => scure.encode(x)],
    ['scure.hex, no native', (x) => scureJS.encode(x), !scureJS],
  ]

  // [name, impl, skip]
  const fromHex = [
    ['@exodus/bytes/hex', (x) => exodus.fromHex(x)],
    ['@exodus/bytes/hex, no native', (x) => exodusA.fromHex(x), !exodusA],
    ['Buffer.from', (x) => Buffer.from(x, 'hex')],
    ['buffer/Buffer.from', (x) => buffer.Buffer.from(x, 'hex'), Buffer === buffer.Buffer],
    ['scure.hex', (x) => scure.decode(x)],
    ['scure.hex, no native', (x) => scureJS.decode(x), !scureJS],
  ]

  test('toHex coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of toHex) {
        if (!skip) t.assert.deepEqual(f(bufs[i]), strings[i], name)
      }
    }
  })

  test('toHex', { timeout: 10_000 }, async () => {
    for (const [name, f, skip] of toHex) {
      await benchmark(`toHex: ${name}`, { skip, args: bufs }, f)
    }
  })

  test('fromHex coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of fromHex) {
        if (!skip) t.assert.deepEqual(f(strings[i]), bufs[i], name)
      }
    }
  })

  test('fromHex', { timeout: 10_000 }, async () => {
    for (const [name, f, skip] of fromHex) {
      await benchmark(`fromHex: ${name}`, { skip, args: strings }, f)
    }
  })
})
