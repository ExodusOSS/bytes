import * as exodus from '@exodus/bytes/base64.js'
import { base64 as scureBase64 } from '@scure/base'
import base64js from 'base64-js'
import buffer from 'buffer/index.js'

import { bufs } from './random.js'

Buffer.TYPED_ARRAY_SUPPORT = true
const exodusAtob = await import('../base64.js?atob')
const { atob } = globalThis
delete globalThis.atob
const exodusPure = await import('../base64.js?pure')
globalThis.atob = atob
delete Buffer.TYPED_ARRAY_SUPPORT

const strings = bufs.map(x => exodus.toBase64(x))

if (Buffer.compare(exodus.fromBase64(strings[0]), bufs[0]) !== 0) throw new Error('exodus')
if (Buffer.compare(exodusAtob.fromBase64(strings[0]), bufs[0]) !== 0) throw new Error('exodus atob')
if (Buffer.compare(exodusPure.fromBase64(strings[0]), bufs[0]) !== 0) throw new Error('exodus pure')
if (Buffer.compare(scureBase64.decode(strings[0]), bufs[0]) !== 0) throw new Error('scure.base64')

for (let i = 0; i < 5; i++) {
  console.time('base64-js')
  for (const str of strings) base64js.toByteArray(str)
  console.timeEnd('base64-js')

  console.time('@exodus/bytes/base64.js')
  for (const str of strings) exodus.fromBase64(str)
  console.timeEnd('@exodus/bytes/base64.js')
  
  console.time('@exodus/bytes/base64.js, atob')
  for (const str of strings) exodusAtob.fromBase64(str)
  console.timeEnd('@exodus/bytes/base64.js, atob')
  
  console.time('@exodus/bytes/base64.js, pure')
  for (const str of strings) exodusPure.fromBase64(str)
  console.timeEnd('@exodus/bytes/base64.js, pure')

  console.time('@scure/base')
  for (const str of strings) scureBase64.decode(str)
  console.timeEnd('@scure/base')

  console.time('Buffer.from')
  for (const str of strings) Buffer.from(str, 'base64')
  console.timeEnd('Buffer.from')

  console.time('buffer/Buffer.from')
  for (const str of strings) buffer.Buffer.from(str, 'base64')
  console.timeEnd('buffer/Buffer.from')
}
