import { decodeLatin1, encodeCharcodes } from './latin1.js'

export const E_STRICT = 'Input is not well-formed utf16'
export const E_STRICT_UNICODE = 'Input is not well-formed Unicode'

export const decode = (u16, loose = false) => {
  if (!loose && !isWellFormed(u16)) throw new SyntaxError(E_STRICT)
  return decodeLatin1(u16, 0, u16.length) // it's capable of decoding Uint16Array to UTF-16 as well
}

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
  let i = 0

  // Speedup with u32, by skipping to the first surrogate
  // Only implemented for aligned input for now, but almost all input is aligned (pooled Buffer or 0 offset)
  if (length > 32 && u16.byteOffset % 4 === 0) {
    const u32length = (u16.byteLength / 4) | 0
    const u32 = new Uint32Array(u16.buffer, u16.byteOffset, u32length)
    for (const last3 = u32length - 3; ; i += 4) {
      if (i >= last3) break // loop is fast enough for moving this here to be _very_ useful, likely due to array access checks
      const a = u32[i]
      const b = u32[i + 1]
      const c = u32[i + 2]
      const d = u32[i + 3]
      if (a & 0x80_00_80_00 || b & 0x80_00_80_00 || c & 0x80_00_80_00 || d & 0x80_00_80_00) break
    }

    for (; i < u32length; i++) if (u32[i] & 0x80_00_80_00) break
    i *= 2
  }

  for (; i < length; i++) {
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
