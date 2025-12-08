import { asciiPrefix, decodeLatin1 } from './latin1.js'
import { decode2string } from './_utils.js'

// prettier-ignore

// 512 bytes map
const map = Uint16Array.of(
  ...new Uint8Array(128).map((_, i) => i),
  // 0x80-0x9f is the Windows1252 byte range that maps differently from Latin1 / Unicode subset
  0x20_ac, 0x00_81, 0x20_1a, 0x01_92, 0x20_1e, 0x20_26, 0x20_20, 0x20_21, // 0x80 - 0x87
  0x02_c6, 0x20_30, 0x01_60, 0x20_39, 0x01_52, 0x00_8d, 0x01_7d, 0x00_8f, // 0x88 - 0x8F
  0x00_90, 0x20_18, 0x20_19, 0x20_1c, 0x20_1d, 0x20_22, 0x20_13, 0x20_14, // 0x90 - 0x97
  0x02_dc, 0x21_22, 0x01_61, 0x20_3a, 0x01_53, 0x00_9d, 0x01_7e, 0x01_78, // 0x98 - 0x9F
  ...new Uint8Array(96).map((_, i) => i + 0xa0),
)

// Used only on Node.js, no reason to optimize for anything else
// E.g. avoiding .from and filling zero-initialized arr manually is faster on Hermes, but we avoid this codepath on Hermes completely
export function mapped(arr, start = 0) {
  const o = Uint16Array.from(start === 0 ? arr : arr.subarray(start)) // copy to modify in-place, also those are 16-bit now
  let i = 0
  for (const end3 = o.length - 3; i < end3; i += 4) {
    o[i] = map[o[i]]
    o[i + 1] = map[o[i + 1]]
    o[i + 2] = map[o[i + 2]]
    o[i + 3] = map[o[i + 3]]
  }

  for (const end = o.length; i < end; i++) o[i] = map[o[i]] // 3 high bytes must match for 0x80-0x9f range
  return o
}

let mapStrings
export function decode(arr) {
  const prefix = decodeLatin1(arr, 0, asciiPrefix(arr))
  if (prefix.length === arr.length) return prefix

  if (!mapStrings) mapStrings = [...map].map((c) => String.fromCharCode(c))
  return prefix + decode2string(arr, prefix.length, arr.length, mapStrings)
}
