import { assertUint8 } from './assert.js'
import { isAscii } from 'node:buffer'
import { asciiPrefix, decodeLatin1 } from './fallback/latin1.js'
import { mapped } from './fallback/windows1252.js'

const isLE = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2

export function windows1252toString(arr) {
  assertUint8(arr)
  if (arr.byteLength === 0) return ''

  if (isAscii(arr)) {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).latin1Slice(0, arr.byteLength) // .latin1Slice is faster than .asciiSlice
  }

  // Node.js TextDecoder is broken, so we can't use it
  // It's also slow anyway
  // TODO: version-detect non-broken Node.js versions and use a native TextDecoder there (when it's fast enough)

  const prefix = decodeLatin1(arr, 0, asciiPrefix(arr))
  if (prefix.length === arr.length) return prefix

  const tail = mapped(arr, prefix.length)

  const suffix = isLE
    ? Buffer.from(tail.buffer, tail.byteOffset, tail.byteLength).ucs2Slice(0, tail.byteLength)
    : decodeLatin1(tail, 0, tail.length) // decodeLatin1 is actually capable of decoding 16-bit codepoints
  return prefix + suffix
}
