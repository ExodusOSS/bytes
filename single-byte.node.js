import { assertUint8 } from './assert.js'
import { isAscii } from 'node:buffer'
import { isDeno, isLE } from './fallback/_utils.js'
import { asciiPrefix, decodeLatin1 } from './fallback/latin1.js'
import { encodingMapper, encodingDecoder, E_STRICT } from './fallback/single-byte.js'

const toBuf = (x) => Buffer.from(x.buffer, x.byteOffset, x.byteLength)

export function createDecoder(encoding, loose = false) {
  if (encoding === 'iso-8859-8-i') encoding = 'iso-8859-8'
  if (isDeno) {
    const jsDecoder = encodingDecoder(encoding) // asserts
    return (arr) => {
      assertUint8(arr)
      if (arr.byteLength === 0) return ''
      if (isAscii(arr)) return toBuf(arr).toString()
      return jsDecoder(arr, loose) // somewhy faster on Deno anyway, TODO: optimize?
    }
  }

  const { incomplete, mapper } = encodingMapper(encoding) // asserts
  return (arr) => {
    assertUint8(arr)
    if (arr.byteLength === 0) return ''
    if (isAscii(arr)) return toBuf(arr).latin1Slice(0, arr.byteLength) // .latin1Slice is faster than .asciiSlice

    // Node.js TextDecoder is broken, so we can't use it. It's also slow anyway

    const prefix = toBuf(arr).latin1Slice(0, asciiPrefix(arr)) // .latin1Slice is faster than .asciiSlice
    if (prefix.length === arr.length) return prefix

    const b = mapper(arr, prefix.length)
    const suffix = isLE ? toBuf(b).ucs2Slice(0, b.byteLength) : decodeLatin1(b, 0, b.length) // decodeLatin1 is actually capable of decoding 16-bit codepoints
    if (!loose && incomplete && suffix.includes('\uFFFD')) throw new TypeError(E_STRICT)
    return prefix + suffix
  }
}

export const windows1252toString = createDecoder('windows-1252')
