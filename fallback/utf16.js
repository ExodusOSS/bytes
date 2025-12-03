import { decodeLatin1, encodeCharcodes } from './latin1.js'

export const E_STRICT = 'Input is not well-formed utf16'
export const E_STRICT_UNICODE = 'Input is not well-formed Unicode'

// it's capable of decoding Uint16Array to UTF-16 as well
export const decode = (arr) => decodeLatin1(arr, 0, arr.length)

// Same as encodeLatin1, but with Uint16Array
export const encode = (str) => encodeCharcodes(str, new Uint16Array(str.length))

export function encodeSwapped(str) {
  const length = str.length
  const arr = new Uint16Array(str.length)
  // TODO: faster path for Hermes? See encodeCharcodes
  for (let i = 0; i < length; i++) {
    const x = str.charCodeAt(i)
    arr[i] = ((x & 0xff) << 8) | (x >> 8)
  }

  return arr
}
