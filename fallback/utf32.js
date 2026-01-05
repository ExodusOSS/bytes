import { isLE } from './_utils.js'

export const E_STRICT = 'Input is not well-formed utf32'

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

function decode32(u32) {
  return String.fromCodePoint.apply(String, u32) // TODO: max len
}

export function decode(u32, loose = false) {
  try {
    return decode32(u32) // throws on invalid input
  } catch {
    if (loose) return decode32(toWellFormed(Uint32Array.from(u32))) // cloned for replacement
    throw new TypeError(E_STRICT)
  }
}

function toWellFormed(u32) {
  const length = u32.length
  for (let i = 0; i < length; i++) {
    // TODO: perf
    if (u32[i] >= 0x11_00_00) u32[i] = 0xff_fd
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

// Maps invalid input to lone trailing surrogates,
// which then reproduces the wanted behavior when passed to utf16 decoder
// TODO: add fast path for prefix without high bits
export function utf32to16(u32) {
  const length = u32.length
  const u16 = new Uint16Array(length * 2)
  let i = 0
  for (let j = 0; j < length; j++) {
    const x = u32[j]
    if (x <= 0xff_ff) {
      // We don't expect any surrogates as utf32 input
      u16[i++] = (x & 0xf8_00) === 0xd8_00 ? 0xdc_00 : x
    } else if (x < 0x11_00_00) {
      const y = x - 0x1_00_00
      u16[i++] = (y >> 10) | 0xd8_00
      u16[i++] = (y & 0x3_ff) | 0xdc_00
    } else {
      u16[i++] = 0xdc_00 // lone trail, will trigger replacement or error
    }
  }

  return i === u16.length ? u16 : u16.subarray(0, i)
}
