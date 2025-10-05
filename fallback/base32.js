import { assert, assertUint8 } from '../assert.js'
import { nativeEncoder, nativeDecoder } from './_utils.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

const BASE32 = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'] // RFC 4648, #6
const BASE32HEX = [...'0123456789ABCDEFGHIJKLMNOPQRSTUV'] // RFC 4648, #7
const BASE32_HELPERS = {}
const BASE32HEX_HELPERS = {}

// We construct output by concatenating chars, this seems to be fine enough on modern JS engines
export function toBase32(arr, isBase32Hex, padding) {
  assertUint8(arr)
  const fullChunks = Math.floor(arr.length / 5)
  const fullChunksBytes = fullChunks * 5
  let o = ''
  let i = 0

  const alphabet = isBase32Hex ? BASE32HEX : BASE32
  const helpers = isBase32Hex ? BASE32HEX_HELPERS : BASE32_HELPERS
  if (!helpers.pairs) {
    helpers.pairs = []
    if (nativeDecoder) {
      // Lazy to save memory in case if this is not needed
      helpers.codepairs = new Uint16Array(32 * 32)
      const u16 = helpers.codepairs
      const u8 = new Uint8Array(u16.buffer, u16.byteOffset, u16.byteLength) // write as 1-byte to ignore BE/LE difference
      for (let i = 0; i < 32; i++) {
        const ic = alphabet[i].charCodeAt(0)
        for (let j = 0; j < 32; j++) u8[(i << 6) | (j << 1)] = u8[(j << 6) | ((i << 1) + 1)] = ic
      }
    } else {
      const p = helpers.pairs
      for (let i = 0; i < 32; i++) {
        for (let j = 0; j < 32; j++) p.push(`${alphabet[i]}${alphabet[j]}`)
      }
    }
  }

  const { pairs, codepairs } = helpers

  // Fast path for complete blocks
  // This whole loop can be commented out, the algorithm won't change, it's just an optimization of the next loop
  if (nativeDecoder) {
    const oa = new Uint16Array(fullChunks * 4)
    for (let j = 0; i < fullChunksBytes; i += 5) {
      const a = arr[i]
      const b = arr[i + 1]
      const c = arr[i + 2]
      const d = arr[i + 3]
      const e = arr[i + 4]
      oa[j++] = codepairs[(a << 2) | (b >> 6)] // 8 + 8 - 5 - 5 = 6 left
      oa[j++] = codepairs[((b & 0x3f) << 4) | (c >> 4)] // 6 + 8 - 5 - 5 = 4 left
      oa[j++] = codepairs[((c & 0xf) << 6) | (d >> 2)] // 4 + 8 - 5 - 5 = 2 left
      oa[j++] = codepairs[((d & 0x3) << 8) | e] // 2 + 8 - 5 - 5 = 0 left
    }

    o = nativeDecoder.decode(oa)
  } else {
    for (; i < fullChunksBytes; i += 5) {
      const a = arr[i]
      const b = arr[i + 1]
      const c = arr[i + 2]
      const d = arr[i + 3]
      const e = arr[i + 4]
      o += pairs[(a << 2) | (b >> 6)] // 8 + 8 - 5 - 5 = 6 left
      o += pairs[((b & 0x3f) << 4) | (c >> 4)] // 6 + 8 - 5 - 5 = 4 left
      o += pairs[((c & 0xf) << 6) | (d >> 2)] // 4 + 8 - 5 - 5 = 2 left
      o += pairs[((d & 0x3) << 8) | e] // 2 + 8 - 5 - 5 = 0 left
    }
  }

  // If we have something left, process it with a full algo
  let carry = 0
  let shift = 3 // First byte needs to be shifted by 3 to get 5 bits
  for (; i < arr.length; i++) {
    const x = arr[i]
    o += alphabet[carry | (x >> shift)] // shift >= 3, so this fits
    if (shift >= 5) {
      shift -= 5
      o += alphabet[(x >> shift) & 0x1f]
    }

    carry = (x << (5 - shift)) & 0x1f
    shift += 3 // Each byte prints 5 bits and leaves 3 bits
  }

  if (shift !== 3) o += alphabet[carry] // shift 3 means we have no carry left
  if (padding) o += ['', '======', '====', '===', '='][arr.length - fullChunksBytes]

  return o
}

// Assumes valid input and no chars after =, checked at API
// Last chunk is rechecked at API too
export function fromBase32(str, isBase32Hex) {
  let inputLength = str.length
  while (str[inputLength - 1] === '=') inputLength-- // already checked that no = are in the middle
  const tailLength = inputLength % 8
  const mainLength = inputLength - tailLength // multiples of 8
  assert([0, 2, 4, 5, 7].includes(tailLength), 'Invalid base32 length') // fast verification

  const alphabet = isBase32Hex ? BASE32HEX : BASE32
  const helpers = isBase32Hex ? BASE32HEX_HELPERS : BASE32_HELPERS

  if (!helpers.fromMap) {
    helpers.fromMap = new Array(256)
    alphabet.forEach((c, i) => {
      helpers.fromMap[c.charCodeAt(0)] = i
      helpers.fromMap[c.toLowerCase().charCodeAt(0)] = i
    })
  }

  const map = helpers.fromMap

  const arr = new Uint8Array(Math.floor((inputLength * 5) / 8))
  let at = 0
  let i = 0

  if (nativeEncoder) {
    const codes = nativeEncoder.encode(str)
    while (i < mainLength) {
      // each 5 bits
      const a = map[codes[i++]]
      const b = map[codes[i++]]
      const c = map[codes[i++]]
      const d = map[codes[i++]]
      const e = map[codes[i++]]
      const f = map[codes[i++]]
      const g = map[codes[i++]]
      const h = map[codes[i++]]
      arr[at++] = (a << 3) | (b >> 2) // 5 + 3
      arr[at++] = ((b << 6) & 0xff) | (c << 1) | (d >> 4) // 2 + 5 + 1
      arr[at++] = ((d << 4) & 0xff) | (e >> 1) // 4 + 4
      arr[at++] = ((e << 7) & 0xff) | (f << 2) | (g >> 3) // 1 + 5 + 2
      arr[at++] = ((g << 5) & 0xff) | h
    }
  } else {
    while (i < mainLength) {
      // each 5 bits
      const a = map[str.charCodeAt(i++)]
      const b = map[str.charCodeAt(i++)]
      const c = map[str.charCodeAt(i++)]
      const d = map[str.charCodeAt(i++)]
      const e = map[str.charCodeAt(i++)]
      const f = map[str.charCodeAt(i++)]
      const g = map[str.charCodeAt(i++)]
      const h = map[str.charCodeAt(i++)]
      arr[at++] = (a << 3) | (b >> 2) // 5 + 3
      arr[at++] = ((b << 6) & 0xff) | (c << 1) | (d >> 4) // 2 + 5 + 1
      arr[at++] = ((d << 4) & 0xff) | (e >> 1) // 4 + 4
      arr[at++] = ((e << 7) & 0xff) | (f << 2) | (g >> 3) // 1 + 5 + 2
      arr[at++] = ((g << 5) & 0xff) | h
    }
  }

  // Last block, valid tailLength: 0 2 4 5 7, checked already
  if (tailLength < 2) return arr
  const a = map[str.charCodeAt(i++)]
  const b = map[str.charCodeAt(i++)]
  arr[at++] = (a << 3) | (b >> 2) // 5 + 3
  if (tailLength < 4) return arr
  const c = map[str.charCodeAt(i++)]
  const d = map[str.charCodeAt(i++)]
  arr[at++] = ((b << 6) & 0xff) | (c << 1) | (d >> 4) // 2 + 5 + 1
  if (tailLength < 5) return arr
  const e = map[str.charCodeAt(i++)]
  arr[at++] = ((d << 4) & 0xff) | (e >> 1) // 4 + 4
  if (tailLength < 7) return arr
  const f = map[str.charCodeAt(i++)]
  const g = map[str.charCodeAt(i++)]
  arr[at++] = ((e << 7) & 0xff) | (f << 2) | (g >> 3) // 1 + 5 + 2
  // Can't be 8, so no h
  return arr
}
