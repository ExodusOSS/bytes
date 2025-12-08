import { asciiPrefix, decodeLatin1 } from './latin1.js'
import { isHermes } from './_utils.js'

// 0x80-0x9f is the Windows1252 byte range that maps differently from Latin1 / Unicode subset
// prettier-ignore
const map = Uint16Array.of(
  0x20_ac, 0x00_81, 0x20_1a, 0x01_92, 0x20_1e, 0x20_26, 0x20_20, 0x20_21, // 0x80 - 0x87
  0x02_c6, 0x20_30, 0x01_60, 0x20_39, 0x01_52, 0x00_8d, 0x01_7d, 0x00_8f, // 0x88 - 0x8F
  0x00_90, 0x20_18, 0x20_19, 0x20_1c, 0x20_1d, 0x20_22, 0x20_13, 0x20_14, // 0x90 - 0x97
  0x02_dc, 0x21_22, 0x01_61, 0x20_3a, 0x01_53, 0x00_9d, 0x01_7e, 0x01_78, // 0x98 - 0x9F
)

function mappedCopy(arr, start = 0) {
  const out = Uint16Array.from(start === 0 ? arr : arr.subarray(start)) // copy to modify in-place, also those are 16-bit now
  let i = 0
  for (const end3 = out.length - 3; i < end3; i += 4) {
    const c0 = out[i], c1 = out[i + 1], c2 = out[i + 2], c3 = out[i + 3] // prettier-ignore
    if ((c0 & 0xe0) === 0x80) out[i] = map[c0 & 0x7f]
    if ((c1 & 0xe0) === 0x80) out[i + 1] = map[c1 & 0x7f]
    if ((c2 & 0xe0) === 0x80) out[i + 2] = map[c2 & 0x7f]
    if ((c3 & 0xe0) === 0x80) out[i + 3] = map[c3 & 0x7f]
  }

  for (const end = out.length; i < end; i++) {
    const c = out[i]
    if ((c & 0xe0) === 0x80) out[i] = map[c & 0x7f] // 3 high bytes must match for 0x80-0x9f range
  }

  return out
}

// Faster in Hermes
function mappedZero(arr, start = 0) {
  const out = new Uint16Array(arr.length - start)
  let i = 0
  let j = start
  for (const end3 = out.length - 3; i < end3; i += 4, j += 4) {
    const c0 = arr[j], c1 = arr[j + 1], c2 = arr[j + 2], c3 = arr[j + 3] // prettier-ignore
    out[i] = (c0 & 0xe0) === 0x80 ? map[c0 & 0x7f] : c0
    out[i + 1] = (c1 & 0xe0) === 0x80 ? map[c1 & 0x7f] : c1
    out[i + 2] = (c2 & 0xe0) === 0x80 ? map[c2 & 0x7f] : c2
    out[i + 3] = (c3 & 0xe0) === 0x80 ? map[c3 & 0x7f] : c3
  }

  for (const end = out.length; i < end; i++, j++) {
    const c = arr[j]
    out[i] = (c & 0xe0) === 0x80 ? map[c & 0x7f] : c // 3 high bytes must match for 0x80-0x9f range
  }

  return out
}

export const mapped = isHermes ? mappedZero : mappedCopy

export function decode(arr) {
  const prefix = decodeLatin1(arr, 0, asciiPrefix(arr))
  if (prefix.length === arr.length) return prefix

  const tail = mapped(arr, prefix.length)
  return prefix + decodeLatin1(tail, 0, tail.length) // decodeLatin1 is actually capable of decoding 16-bit codepoints
}
