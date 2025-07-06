import * as exodus from '@exodus/bytes/base'
import { base64 as scureBase64 } from '@scure/base'
import base64js from 'base64-js'

import { bufs } from './random.js'

const val = exodus.toBase64(bufs[0])
if (scureBase64.encode(bufs[0]) !== val) throw new Error('scure.base64')

for (let i = 0; i < 5; i++) {
  console.time('base64-js')
  for (const buf of bufs) base64js.fromByteArray(buf)
  console.timeEnd('base64-js')

  console.time('@exodus/bytes/base')
  for (const buf of bufs) exodus.toBase64(buf)
  console.timeEnd('@exodus/bytes/base')

  console.time('@scure/base')
  for (const buf of bufs) scureBase64.encode(buf)
  console.timeEnd('@scure/base')

  console.time('Buffer.from')
  for (const buf of bufs) Buffer.from(buf).toString('base64')
  console.timeEnd('Buffer.from')
}
