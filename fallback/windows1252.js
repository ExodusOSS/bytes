import { asciiPrefix, decodeLatin1 } from './latin1.js'

// 0x80-0x9f is the Windows1252 byte range that maps differently from Latin1 / Unicode subset
// prettier-ignore
const map = [
  0x20_ac, 0x00_81, 0x20_1a, 0x01_92, 0x20_1e, 0x20_26, 0x20_20, 0x20_21, // 0x80 - 0x87
  0x02_c6, 0x20_30, 0x01_60, 0x20_39, 0x01_52, 0x00_8d, 0x01_7d, 0x00_8f, // 0x88 - 0x8F
  0x00_90, 0x20_18, 0x20_19, 0x20_1c, 0x20_1d, 0x20_22, 0x20_13, 0x20_14, // 0x90 - 0x97
  0x02_dc, 0x21_22, 0x01_61, 0x20_3a, 0x01_53, 0x00_9d, 0x01_7e, 0x01_78, // 0x98 - 0x9F
]

export function decode(arr) {
  const prefix = decodeLatin1(arr, 0, asciiPrefix(arr))
  if (prefix.length === arr.length) return prefix

  const tail = Uint16Array.from(arr.subarray(prefix.length)) // copy to modify in-place, also those are 16-bit now
  const end = tail.length
  for (let i = 0; i < end; i++) {
    const c = tail[i]
    if ((c & 0b1110_0000) === 0b1000_0000) tail[i] = map[c & 0x7f] // 3 high bytes must match for 0x80-0x9f range
  }

  return prefix + decodeLatin1(tail, 0, tail.length) // decodeLatin1 is actually capable of decoding 16-bit codepoints
}
