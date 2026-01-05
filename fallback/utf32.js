import { isLE } from './_utils.js'

export const E_STRICT = 'Input is not well-formed utf32'
const replacementCodepoint = 0xff_fd

export const to8 = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
const to32 = (a) => new Uint32Array(a.buffer, a.byteOffset, a.byteLength / 4) // Requires checked length and alignment!

/* eslint-disable @exodus/mutable/no-param-reassign-prop-only */

// Assumes checked length % 4 === 0, otherwise does not swap tail
export function swap32(u8) {
  let i = 0
  for (const last3 = u8.length - 3; i < last3; i += 4) {
    const x0 = u8[i]
    const x1 = u8[i + 1]
    const x2 = u8[i + 2]
    const x3 = u8[i + 3]
    u8[i] = x3
    u8[i + 1] = x2
    u8[i + 2] = x1
    u8[i + 3] = x0
  }

  return u8
}

export function to32input(u8, le) {
  // Assume even number of bytes
  if (le === isLE) return to32(u8.byteOffset % 4 === 0 ? u8 : Uint8Array.from(u8))
  return to32(swap32(Uint8Array.from(u8)))
}

export function decode(u32) {
  return String.fromCodePoint.apply(String, u32) // TODO: max len
}

// No surrogates (paired or unpaired), no out of range codepoints
export function isStrict(u32) {
  const length = u32.length
  for (let i = 0; i < length; i++) {
    const x = u32[i]
    if (x >= 0xd8_00 && (x < 0xe0_00 || x >= 0x11_00_00)) return false
  }

  return true
}

export function toWellFormed(u32) {
  const length = u32.length
  for (let i = 0; i < length; i++) {
    const x = u32[i]
    if (x >= 0xd8_00) {
      if (x < 0xe0_00) {
        // An unexpected trail or a lead at the very end of input
        if (x > 0xdb_ff || i + 1 >= length) {
          u32[i] = replacementCodepoint
        } else {
          const next = u32[i + 1] // Process valid pairs immediately
          if (next < 0xdc_00 || next >= 0xe0_00) {
            u32[i] = replacementCodepoint
          } else {
            i++ // consume next
          }
        }
      } else if (x >= 0x11_00_00) {
        // also fix out-of-range in the same pass, both are unlikely
        u32[i] = replacementCodepoint
      }
    }
  }

  return u32
}

// Only defined on valid input
// TODO: add fast path for prefix without high bits
export function utf16to32(u16) {
  const length = u16.length
  const u32 = new Uint32Array(length)
  let i = 0
  for (let j = 0; j < length; j++) {
    const x0 = u16[j]
    if ((x0 & 0xf8_00) === 0xd8_00) {
      u32[i++] = 0x1_00_00 + ((u16[++j] & 0x3_ff) | ((x0 & 0x3_ff) << 10))
    } else {
      u32[i++] = x0
    }
  }

  return i === length ? u32 : u32.subarray(0, i)
}

// Only defined on valid input
// TODO: add fast path for prefix without high bits?
export function utf32to16(u32) {
  const length = u32.length
  const u16 = new Uint16Array(length * 2)
  let i = 0
  for (let j = 0; j < length; j++) {
    const x = u32[j]
    if (x <= 0xff_ff) {
      u16[i++] = x
    } else {
      const y = x - 0x1_00_00
      u16[i++] = (y >> 10) | 0xd8_00
      u16[i++] = (y & 0x3_ff) | 0xdc_00
    }
  }

  return i === u16.length ? u16 : u16.subarray(0, i)
}
