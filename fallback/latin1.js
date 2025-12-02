import { nativeEncoder } from './_utils.js'

// See http://stackoverflow.com/a/22747272/680742, which says that lowest limit is in Chrome, with 0xffff args
// On Hermes, actual max is 0x20_000 minus current stack depth, 1/16 of that should be safe
const maxFunctionArgs = 0x20_00

export function asciiPrefix(arr) {
  let p = 0 // verified ascii bytes
  const length = arr.length
  // Threshold tested on Hermes (worse on <=48, better on >=52)
  // Also on v8 arrs of size <=64 might be on heap and using Uint32Array on them is unoptimal
  if (length > 64) {
    // Speedup with u32
    const u32start = (4 - (arr.byteOffset & 3)) % 4 // offset start by this many bytes for alignment
    for (; p < u32start; p++) if (arr[p] >= 0x80) return p
    const u32length = ((arr.byteLength - u32start) / 4) | 0
    const u32 = new Uint32Array(arr.buffer, arr.byteOffset + u32start, u32length)
    let i = 0
    for (const last3 = u32length - 3; ; p += 16, i += 4) {
      if (i >= last3) break // loop is fast enough for moving this here to be _very_ useful, likely due to array access checks
      const a = u32[i]
      const b = u32[i + 1]
      const c = u32[i + 2]
      const d = u32[i + 3]
      if (a & 0x80_80_80_80 || b & 0x80_80_80_80 || c & 0x80_80_80_80 || d & 0x80_80_80_80) break
    }

    for (; i < u32length; p += 4, i++) if (u32[i] & 0x80_80_80_80) break
  }

  for (; p < length; p++) if (arr[p] >= 0x80) return p
  return length
}

// Capable of decoding Uint16Array to UTF-16 as well as Uint8Array to Latin-1
export function decodeLatin1(arr, start = 0, stop = arr.length) {
  start |= 0
  stop |= 0
  const total = stop - start
  if (total === 0) return ''
  if (total > maxFunctionArgs) {
    let prefix = ''
    for (let i = start; i < stop; ) {
      const i1 = Math.min(stop, i + maxFunctionArgs)
      prefix += String.fromCharCode.apply(String, arr.subarray(i, i1))
      i = i1
    }

    return prefix
  }

  const sliced = start === 0 && stop === arr.length ? arr : arr.subarray(start, stop)
  return String.fromCharCode.apply(String, sliced)
}

/* eslint-disable @exodus/mutable/no-param-reassign-prop-only */

export const encodeCharcodes = globalThis.HermesInternal
  ? (str, arr) => {
      const length = str.length
      if (length > 64) {
        const at = str.charCodeAt.bind(str) // faster on strings from ~64 chars on Hermes, but can be 10x slower on e.g. JSC
        for (let i = 0; i < length; i++) arr[i] = at(i)
      } else {
        for (let i = 0; i < length; i++) arr[i] = str.charCodeAt(i)
      }

      return arr
    }
  : (str, arr) => {
      const length = str.length
      // Can be optimized with unrolling, but this is not used on non-Hermes atm
      for (let i = 0; i < length; i++) arr[i] = str.charCodeAt(i)
      return arr
    }

/* eslint-enable @exodus/mutable/no-param-reassign-prop-only */

export const encodeLatin1 = (str) => encodeCharcodes(str, new Uint8Array(str.length))

// Expects nativeEncoder to be present
export const encodeAscii = globalThis.HermesInternal
  ? (str, ERR) => {
      // Much faster in Hermes
      const codes = new Uint8Array(str.length + 4) // overshoot by a full utf8 char
      const info = nativeEncoder.encodeInto(str, codes)
      if (info.read !== str.length || info.written !== str.length) throw new SyntaxError(ERR) // non-ascii
      return codes.subarray(0, str.length)
    }
  : (str, ERR) => {
      const codes = nativeEncoder.encode(str)
      if (codes.length !== str.length) throw new SyntaxError(ERR) // non-ascii
      return codes
    }
