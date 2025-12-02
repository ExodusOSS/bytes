import { decodeLatin1 } from './latin1.js'

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
// TODO: Unify?
export const encode = globalThis.HermesInternal
  ? (str) => {
      const length = str.length
      const arr = new Uint16Array(length)
      if (length > 64) {
        const at = str.charCodeAt.bind(str) // faster on strings from ~64 chars on Hermes, but can be 10x slower on e.g. JSC
        for (let i = 0; i < length; i++) arr[i] = at(i)
      } else {
        for (let i = 0; i < length; i++) arr[i] = str.charCodeAt(i)
      }

      return arr
    }
  : (str) => {
      const length = str.length
      const arr = new Uint16Array(length)
      // Can be optimized with unrolling, but this is not used on non-Hermes atm
      for (let i = 0; i < length; i++) arr[i] = str.charCodeAt(i)
      return arr
    }
