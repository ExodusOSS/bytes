import * as exodus from '@exodus/bytes/base64.js'
import { base64 as scureBase64 } from '@scure/base'
import base64js from 'base64-js'
import buffer from 'buffer/index.js'

import { bufs } from './random.js'

Buffer.TYPED_ARRAY_SUPPORT = true
const exodusPure = await import('../base64.js?pure')
delete Buffer.TYPED_ARRAY_SUPPORT

const val = exodus.toBase64(bufs[0])
if (exodusPure.toBase64(bufs[0]) !== val) throw new Error('exodus pure')
if (scureBase64.encode(bufs[0]) !== val) throw new Error('scure.base64')

for (let i = 0; i < 5; i++) {
  console.time('base64-js')
  for (const buf of bufs) base64js.fromByteArray(buf)
  console.timeEnd('base64-js')

  console.time('@exodus/bytes/base64.js')
  for (const buf of bufs) exodus.toBase64(buf)
  console.timeEnd('@exodus/bytes/base64.js')

  console.time('@exodus/bytes/base64.js, pure')
  for (const buf of bufs) exodusPure.toBase64(buf)
  console.timeEnd('@exodus/bytes/base64.js, pure')

  console.time('@scure/base')
  for (const buf of bufs) scureBase64.encode(buf)
  console.timeEnd('@scure/base')

  console.time('Buffer.from')
  for (const buf of bufs) Buffer.from(buf).toString('base64')
  console.timeEnd('Buffer.from')

  console.time('buffer/Buffer.from')
  for (const buf of bufs) buffer.Buffer.from(buf).toString('base64')
  console.timeEnd('buffer/Buffer.from')
}
