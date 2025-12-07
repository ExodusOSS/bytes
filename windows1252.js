import { assertUint8 } from './assert.js'
import { nativeDecoder } from './fallback/_utils.js'
import * as js from './fallback/windows1252.js'

const decoder = nativeDecoder ? new globalThis.TextDecoder('windows-1252') : null

export function windows1252toString(arr) {
  assertUint8(arr)
  if (arr.byteLength === 0) return ''
  if (decoder) return decoder.decode(arr) // Node.js and browsers
  return js.decode(arr)
}
