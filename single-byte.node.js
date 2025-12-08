import { assertUint8 } from './assert.js'
import { isAscii } from 'node:buffer'
import { asciiPrefix, decodeLatin1 } from './fallback/latin1.js'
import { encodingMapper } from './fallback/single-byte.js'

const isLE = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2
const toBuf = (x) => Buffer.from(x.buffer, x.byteOffset, x.byteLength)

export function createDecoder(encoding) {
  const mapper = encodingMapper(encoding) // asserts
  return (arr) => {
    assertUint8(arr)
    if (arr.byteLength === 0) return ''
    if (isAscii(arr)) return toBuf(arr).latin1Slice(0, arr.byteLength) // .latin1Slice is faster than .asciiSlice

    // Node.js TextDecoder is broken, so we can't use it. It's also slow anyway

    const prefix = decodeLatin1(arr, 0, asciiPrefix(arr))
    if (prefix.length === arr.length) return prefix

    const b = mapper(arr, prefix.length)
    return prefix + (isLE ? toBuf(b).ucs2Slice(0, b.byteLength) : decodeLatin1(b, 0, b.length)) // decodeLatin1 is actually capable of decoding 16-bit codepoints
  }
}

export const windows1252toString = createDecoder('windows-1252')
