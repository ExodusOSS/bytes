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

export function decode(u32, loose = false, checked = false) {
  if (loose && !checked) return decode32(toWellFormed(Uint32Array.from(u32))) // cloned for replacement
  try {
    return decode32(u32) // throws on invalid input
  } catch {
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
