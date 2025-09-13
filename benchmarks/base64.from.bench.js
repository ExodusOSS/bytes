import * as exodus from '@exodus/bytes/base64.js'
import { base64 as scureBase64 } from '@scure/base'
import base64js from 'base64-js'
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'

import { bufs } from './random.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer

const benchmarks = new Map()
function benchmark(name, method) {
  benchmarks.set(name, method)
}

describe('benchmarks', async () => {
  let scureBase64js // Fallback without Uint8Array.fromBase64
  let exodusA // Fallback without Uint8Array.fromBase64
  let exodusB // Fallback without native Buffer
  let exodusC // Fallback without atob

  const reset = []
  if (Uint8Array.fromBase64) {
    const { fromBase64 } = Uint8Array
    delete Uint8Array.fromBase64
    reset.push(() => Uint8Array.fromBase64 = fromBase64)
    exodusA = await import('../base64.js?a') // eslint-disable-line @exodus/import/no-unresolved
    const scureJS = await import('@scure/base?a') // eslint-disable-line @exodus/import/no-unresolved
    scureBase64js = scureJS.base64
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.TYPED_ARRAY_SUPPORT = true
    reset.push(() => delete delete Buffer.TYPED_ARRAY_SUPPORT)
    exodusB = await import('../base64.js?b') // eslint-disable-line @exodus/import/no-unresolved
  }

  if (globalThis.atob) {
    const { atob } = globalThis
    delete globalThis.atob
    exodusC = await import('../base64.js?c') // eslint-disable-line @exodus/import/no-unresolved
    globalThis.atob = atob
  }

  for (const f of reset) f()

  benchmark('base64-js', () => {
    for (const str of strings) base64js.toByteArray(str)
  })

  benchmark('@exodus/bytes/base64.js', () => {
    for (const str of strings) exodus.fromBase64(str)
  })

  if (exodusA) {
    benchmark('@exodus/bytes/base64.js, no native', () => {
      for (const str of strings) exodusA.fromBase64(str)
    })
  }

  if (exodusB) {
    benchmark('@exodus/bytes/base64.js, no Buffer', () => {
      for (const str of strings) exodusB.fromBase64(str)
    })
  }

  if (exodusC) {
    benchmark('@exodus/bytes/base64.js, no atob', () => {
      for (const str of strings) exodusC.fromBase64(str)
    })
  }

  benchmark('Buffer.from', () => {
    for (const str of strings) Buffer.from(str, 'base64')
  })

  if (Buffer !== buffer.Buffer) {
    benchmark('buffer/Buffer.from', () => {
      for (const str of strings) buffer.Buffer.from(str, 'base64')
    })
  }

  benchmark('@scure/base', () => {
    for (const str of strings) scureBase64.decode(str)
  })

  if (scureBase64js) {
    benchmark('@scure/base, no native', () => {
      for (const str of strings) scureBase64js.decode(str)
    })
  }

  const strings = bufs.map((x) => exodus.toBase64(x))

  test('fromBase64 coherence', (t) => {
    t.assert.deepEqual(exodus.fromBase64(strings[0]), bufs[0], 'exodus')
    if (exodusA) t.assert.deepEqual(exodusA.fromBase64(strings[0]), bufs[0], 'exodus A')
    if (exodusB) t.assert.deepEqual(exodusB.fromBase64(strings[0]), bufs[0], 'exodus B')
    if (exodusC) t.assert.deepEqual(exodusC.fromBase64(strings[0]), bufs[0], 'exodus C')
    t.assert.deepEqual(scureBase64.decode(strings[0]), bufs[0], 'scure.base64')
  })

  for (let i = 0; i < 5; i++) {
    test('fromBase64', () => {
      for (const [name, method] of benchmarks) {
        if (globalThis.gc) for (let i = 0; i < 4; i++) gc()
        console.time(name)
        method()
        console.timeEnd(name)
      }
    })
  }
})
