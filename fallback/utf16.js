import { decodeLatin1, encodeCharcodes } from './latin1.js'

export const E_STRICT = 'Input is not well-formed utf16'
export const E_STRICT_UNICODE = 'Input is not well-formed Unicode'

// it's capable of decoding Uint16Array to UTF-16 as well
export const decode = (arr) => decodeLatin1(arr, 0, arr.length)

export function encode(str, loose = false, swapped = false) {
  const arr = new Uint16Array(str.length)
  if (loose && !swapped) return encodeCharcodes(str, arr) // Same as encodeLatin1, but with Uint16Array
  if (loose && swapped) return encodeSwappedLoose(str, arr)
  return swapped ? encodeSwappedFatal(str, arr) : encodeFatal(str, arr)
}

// Splitting paths into small functions helps (at least on SpiderMonkey)
/* eslint-disable @exodus/mutable/no-param-reassign-prop-only */

function encodeSwappedLoose(str, arr) {
  // TODO: faster path for Hermes? See encodeCharcodes
  const length = str.length
  for (let i = 0; i < length; i++) {
    const x = str.charCodeAt(i)
    arr[i] = ((x & 0xff) << 8) | (x >> 8)
  }

  return arr
}

// lead: d800 - dbff, trail: dc00 - dfff

function encodeSwappedFatal(str, arr) {
  const length = str.length
  for (let i = 0; i < length; i++) {
    const code = str.charCodeAt(i)
    arr[i] = ((code & 0xff) << 8) | (code >> 8)
    if (code >= 0xd8_00 && code < 0xe0_00) {
      // An unexpected trail or a lead at the very end of input
      if (code > 0xdb_ff || i + 1 >= length) throw new SyntaxError(E_STRICT_UNICODE)
      i++ // consume next
      const next = str.charCodeAt(i) // Process valid pairs immediately
      if (next < 0xdc_00 || next >= 0xe0_00) throw new SyntaxError(E_STRICT_UNICODE)
      arr[i] = ((next & 0xff) << 8) | (next >> 8)
    }
  }

  return arr
}

function encodeFatal(str, arr) {
  const length = str.length
  for (let i = 0; i < length; i++) {
    const code = str.charCodeAt(i)
    arr[i] = code
    if (code >= 0xd8_00 && code < 0xe0_00) {
      // An unexpected trail or a lead at the very end of input
      if (code > 0xdb_ff || i + 1 >= length) throw new SyntaxError(E_STRICT_UNICODE)
      i++ // consume next
      const next = str.charCodeAt(i) // Process valid pairs immediately
      if (next < 0xdc_00 || next >= 0xe0_00) throw new SyntaxError(E_STRICT_UNICODE)
      arr[i] = next
    }
  }

  return arr
}

export function isWellFormed(u16) {
  const length = u16.length
  for (let i = 0; i < length; i++) {
    const code = u16[i]
    if (code >= 0xd8_00 && code < 0xe0_00) {
      // An unexpected trail or a lead at the very end of input
      if (code > 0xdb_ff || i + 1 >= length) return false
      i++ // consume next
      const next = u16[i] // Process valid pairs immediately
      if (next < 0xdc_00 || next >= 0xe0_00) return false
    }
  }

  return true
}
