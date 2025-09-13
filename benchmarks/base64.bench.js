import * as exodus from '@exodus/bytes/base64.js'
import { base64 as scureBase64 } from '@scure/base'
import base64js from 'base64-js'
import buffer from 'buffer/index.js'

import { bufs } from './random.js'
import { describe, test } from 'node:test'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer

describe('benchmarks', async () => {
  let exodusPure
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    Buffer.TYPED_ARRAY_SUPPORT = true
    exodusPure = await import('../base64.js?pure') // eslint-disable-line @exodus/import/no-unresolved
    delete Buffer.TYPED_ARRAY_SUPPORT
  }

  test('toBase64 coherence', (t) => {
    const val = exodus.toBase64(bufs[0])
    t.assert.equal(base64js.fromByteArray(bufs[0]), val, 'base64-js')
    if (exodusPure) t.assert.equal(exodusPure.toBase64(bufs[0]), val, 'exodus pure')
    t.assert.equal(Buffer.from(bufs[0]).toString('base64'), val, 'Buffer.from')
    t.assert.equal(buffer.Buffer.from(bufs[0]).toString('base64'), val, 'buffer/Buffer.from')
    t.assert.equal(scureBase64.encode(bufs[0]), val, 'scure.base64')
  })

  for (let i = 0; i < 5; i++) {
    test('toBase64', () => {
      console.time('base64-js')
      for (const buf of bufs) base64js.fromByteArray(buf)
      console.timeEnd('base64-js')

      console.time('@exodus/bytes/base64.js')
      for (const buf of bufs) exodus.toBase64(buf)
      console.timeEnd('@exodus/bytes/base64.js')

      if (exodusPure) {
        console.time('@exodus/bytes/base64.js, pure')
        for (const buf of bufs) exodusPure.toBase64(buf)
        console.timeEnd('@exodus/bytes/base64.js, pure')
      }

      console.time('Buffer.from, zero-copy')
      for (const buf of bufs) Buffer.from(buf.buffer, buf.byteOffset, buf.length).toString('base64')
      console.timeEnd('Buffer.from, zero-copy')

      console.time('Buffer.from')
      for (const buf of bufs) Buffer.from(buf).toString('base64')
      console.timeEnd('Buffer.from')

      if (buffer.Buffer !== Buffer) {
        console.time('buffer/Buffer.from')
        for (const buf of bufs) buffer.Buffer.from(buf).toString('base64')
        console.timeEnd('buffer/Buffer.from')
      }

      console.time('@scure/base')
      for (const buf of bufs) scureBase64.encode(buf)
      console.timeEnd('@scure/base')
    })
  }
})
