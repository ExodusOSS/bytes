import * as exodus from '@exodus/bytes/hex.js'
import { hex as scureHex } from '@scure/base'
import buffer from 'buffer/index.js'

import { bufs } from './random.js'

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
Buffer.TYPED_ARRAY_SUPPORT = true
const exodusPure = await import('../hex.js?pure')
delete Buffer.TYPED_ARRAY_SUPPORT

const strings = bufs.map((x) => exodus.fromTypedArray(x, 'hex'))

if (Buffer.compare(exodus.fromHex(strings[0]), bufs[0]) !== 0) throw new Error('exodus')
if (Buffer.compare(exodusPure.fromHex(strings[0]), bufs[0]) !== 0) throw new Error('exodus pure')
if (Buffer.compare(scureHex.decode(strings[0]), bufs[0]) !== 0) throw new Error('scure.hex')

for (let i = 0; i < 5; i++) {
  console.time('@exodus/bytes/hex.js')
  for (const str of strings) exodus.fromHex(str)
  console.timeEnd('@exodus/bytes/hex.js')

  console.time('@exodus/bytes/hex.js, pure')
  for (const str of strings) exodusPure.fromHex(str)
  console.timeEnd('@exodus/bytes/hex.js, pure')

  console.time('@scure/base')
  for (const str of strings) scureHex.decode(str)
  console.timeEnd('@scure/base')

  console.time('Buffer.from')
  for (const str of strings) Buffer.from(str, 'hex')
  console.timeEnd('Buffer.from')

  console.time('buffer/Buffer.from')
  for (const str of strings) buffer.Buffer.from(str, 'hex')
  console.timeEnd('buffer/Buffer.from')
}
