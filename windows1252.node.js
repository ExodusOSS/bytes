import { assertUint8 } from './assert.js'
import { isAscii } from 'node:buffer'
import * as js from './fallback/windows1252.js'

export function windows1252toString(arr) {
  assertUint8(arr)
  if (arr.byteLength === 0) return ''

  if (isAscii(arr)) {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).latin1Slice(0, arr.byteLength) // .latin1Slice is faster than .asciiSlice
  }

  // Node.js TextDecoder is broken, so we can't use it
  // It's also slow anyway
  // TODO: version-detect non-broken Node.js versions and use a native TextDecoder there (when it's fast enough)

  return js.decode(arr)
}
