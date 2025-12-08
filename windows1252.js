import { assertUint8 } from './assert.js'
import { nativeDecoder } from './fallback/_utils.js'
import { encodingDecoder } from './fallback/single-byte-encoding.js'

const decoder = nativeDecoder ? new globalThis.TextDecoder('windows-1252') : null

const jsDecoder = encodingDecoder('windows1252')
export function windows1252toString(arr) {
  assertUint8(arr)
  if (arr.byteLength === 0) return ''
  if (decoder) return decoder.decode(arr) // Node.js and browsers
  return jsDecoder(arr)
}
