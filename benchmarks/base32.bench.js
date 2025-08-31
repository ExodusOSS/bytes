import * as exodus from '@exodus/bytes/base32.js'
import { base32 as scureBase32 } from '@scure/base'
import base32js from 'base32.js'

import { bufs } from './random.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer

const val = exodus.toBase32(bufs[0])
if (scureBase32.encode(bufs[0]) !== val) throw new Error('scure.base32')

for (let i = 0; i < 5; i++) {
  console.time('base32.js')
  for (const buf of bufs) base32js.encode(buf)
  console.timeEnd('base32.js')

  console.time('@exodus/bytes/base')
  for (const buf of bufs) exodus.toBase32(buf)
  console.timeEnd('@exodus/bytes/base')

  console.time('@scure/base')
  for (const buf of bufs) scureBase32.encode(buf)
  console.timeEnd('@scure/base')
}
