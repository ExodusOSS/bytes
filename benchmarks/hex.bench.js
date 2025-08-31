import * as exodus from '@exodus/bytes/hex.js'
import { hex as scureHex } from '@scure/base'
import buffer from 'buffer/index.js'

import { bufs } from './random.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
Buffer.TYPED_ARRAY_SUPPORT = true
const exodusPure = await import('../hex.js?pure')
delete Buffer.TYPED_ARRAY_SUPPORT

const val = exodus.toHex(bufs[0])
if (scureHex.encode(bufs[0]) !== val) throw new Error('scure.hex')
if (exodusPure.toHex(bufs[0]) !== val) throw new Error('exodus pure')

for (let i = 0; i < 5; i++) {
  console.time('@exodus/bytes/hex.js')
  for (const buf of bufs) exodus.toHex(buf)
  console.timeEnd('@exodus/bytes/hex.js')

  console.time('@exodus/bytes/hex.js, pure')
  for (const buf of bufs) exodusPure.toHex(buf)
  console.timeEnd('@exodus/bytes/hex.js, pure')

  console.time('@scure/base')
  for (const buf of bufs) scureHex.encode(buf)
  console.timeEnd('@scure/base')

  console.time('Buffer.from')
  for (const buf of bufs) Buffer.from(buf).toString('hex')
  console.timeEnd('Buffer.from')

  console.time('buffer/Buffer.from')
  for (const buf of bufs) buffer.Buffer.from(buf).toString('hex')
  console.timeEnd('buffer/Buffer.from')
}
