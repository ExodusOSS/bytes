import { assertUint8 } from './assert.js'
import { isAscii } from 'node:buffer'
import { isDeno, isLE } from './fallback/_utils.js'
import { asciiPrefix, decodeLatin1 } from './fallback/latin1.js'
import { encodingMapper, encodingDecoder, E_STRICT } from './fallback/single-byte.js'

const toBuf = (x) => Buffer.from(x.buffer, x.byteOffset, x.byteLength)

function latin1Prefix(arr, start) {
  let p = start | 0
  const length = arr.length
  for (const len3 = length - 3; p < len3; p += 4) {
    if ((arr[p] & 0xe0) === 0x80) return p
    if ((arr[p + 1] & 0xe0) === 0x80) return p + 1
    if ((arr[p + 2] & 0xe0) === 0x80) return p + 2
    if ((arr[p + 3] & 0xe0) === 0x80) return p + 3
  }

  for (; p < length; p++) {
    if ((arr[p] & 0xe0) === 0x80) return p
  }

  return length
}

export function createSinglebyteDecoder(encoding, loose = false) {
  if (encoding === 'iso-8859-8-i') encoding = 'iso-8859-8'
  const latin1path = encoding === 'windows-1252' // TODO: are there more?
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

    let prefixBytes = asciiPrefix(arr)
    let prefix = ''
    if (latin1path) prefixBytes = latin1Prefix(arr, prefixBytes)
    if (prefixBytes > 64 || prefixBytes === arr.length) {
      prefix = toBuf(arr).latin1Slice(0, prefixBytes) // .latin1Slice is faster than .asciiSlice
      if (prefixBytes === arr.length) return prefix
    }

    const b = mapper(arr, prefix.length) // prefix.length can mismatch prefixBytes
    const suffix = isLE ? toBuf(b).ucs2Slice(0, b.byteLength) : decodeLatin1(b, 0, b.length) // decodeLatin1 is actually capable of decoding 16-bit codepoints
    if (!loose && incomplete && suffix.includes('\uFFFD')) throw new TypeError(E_STRICT)
    return prefix + suffix
  }
}

export const windows1252toString = createSinglebyteDecoder('windows-1252')
