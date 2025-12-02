import { decodeLatin1, encodeCharcodes } from './latin1.js'

export const E_STRICT = 'Input is not well-formed utf16'
export const E_STRICT_UNICODE = 'Input is not well-formed Unicode'

export function swapEndianness(u8, inPlace = false) {
  // Assume even number of bytes
  const res = inPlace ? u8 : new Uint8Array(u8.length)

  let i = 0
  for (const last3 = u8.length - 3; i < last3; i += 4) {
    const x0 = u8[i]
    const x1 = u8[i + 1]
    const x2 = u8[i + 2]
    const x3 = u8[i + 3]
    res[i] = x1
    res[i + 1] = x0
    res[i + 2] = x3
    res[i + 3] = x2
  }

  for (const last = u8.length - 1; i < last; i += 2) {
    const x0 = u8[i]
    const x1 = u8[i + 1]
    res[i] = x1
    res[i + 1] = x0
  }

  return res
}

// it's capable of decoding Uint16Array to UTF-16 as well
export const decode = (arr) => decodeLatin1(arr, 0, arr.length)

// Same as encodeLatin1, but with Uint16Array
export const encode = (str) => encodeCharcodes(str, new Uint16Array(str.length))
