import { assertUint8 } from '../assert.js'
import { nativeEncoder, nativeDecoder } from './_utils.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

const BASE64 = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/']
const BASE64URL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_']
const BASE64_HELPERS = {}
const BASE64URL_HELPERS = {}

export const E_CHAR = 'Invalid character in base64 input'
export const E_PADDING = 'Invalid base64 padding'
export const E_LENGTH = 'Invalid base64 length'
export const E_LAST = 'Invalid last chunk'

// Alternatively, we could have mapped 0-255 bytes to charcodes and just used btoa(ascii),
// but that approach is _slower_ than our toBase64js function, even on Hermes

// We construct output by concatenating chars, this seems to be fine enough on modern JS engines
export function toBase64(arr, isURL, padding) {
  assertUint8(arr)
  const fullChunks = Math.floor(arr.length / 3)
  const fullChunksBytes = fullChunks * 3
  let o = ''
  let i = 0

  const alphabet = isURL ? BASE64URL : BASE64
  const helpers = isURL ? BASE64URL_HELPERS : BASE64_HELPERS
  if (!helpers.pairs) {
    helpers.pairs = []
    if (nativeDecoder) {
      // Lazy to save memory in case if this is not needed
      helpers.codepairs = new Uint16Array(64 * 64)
      const u16 = helpers.codepairs
      const u8 = new Uint8Array(u16.buffer, u16.byteOffset, u16.byteLength) // write as 1-byte to ignore BE/LE difference
      for (let i = 0; i < 64; i++) {
        const ic = alphabet[i].charCodeAt(0)
        for (let j = 0; j < 64; j++) u8[(i << 7) | (j << 1)] = u8[(j << 7) | ((i << 1) + 1)] = ic
      }
    } else {
      const p = helpers.pairs
      for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) p.push(`${alphabet[i]}${alphabet[j]}`)
      }
    }
  }

  const { pairs, codepairs } = helpers

  // Fast path for complete blocks
  // This whole loop can be commented out, the algorithm won't change, it's just an optimization of the next loop
  if (nativeDecoder) {
    const oa = new Uint16Array(fullChunks * 2)
    for (let j = 0; i < fullChunksBytes; i += 3) {
      const a = arr[i]
      const b = arr[i + 1]
      const c = arr[i + 2]
      oa[j++] = codepairs[(a << 4) | (b >> 4)]
      oa[j++] = codepairs[((b & 0x0f) << 8) | c]
    }

    o = nativeDecoder.decode(oa)
  } else {
    for (; i < fullChunksBytes; i += 3) {
      const a = arr[i]
      const b = arr[i + 1]
      const c = arr[i + 2]
      o += pairs[(a << 4) | (b >> 4)] + pairs[((b & 0x0f) << 8) | c]
    }
  }

  // If we have something left, process it with a full algo
  let carry = 0
  let shift = 2 // First byte needs to be shifted by 2 to get 6 bits
  const length = arr.length
  for (; i < length; i++) {
    const x = arr[i]
    o += alphabet[carry | (x >> shift)] // shift >= 2, so this fits
    if (shift === 6) {
      shift = 0
      o += alphabet[x & 0x3f]
    }

    carry = (x << (6 - shift)) & 0x3f
    shift += 2 // Each byte prints 6 bits and leaves 2 bits
  }

  if (shift !== 2) o += alphabet[carry] // shift 2 means we have no carry left
  if (padding) o += ['', '==', '='][length - fullChunksBytes]

  return o
}

// TODO: can this be optimized? This only affects non-Hermes barebone engines though
const mapSize = nativeEncoder ? 128 : 65_536 // we have to store 64 KiB map or recheck everything if we can't decode to byte array

export function fromBase64(str, isURL) {
  let inputLength = str.length
  while (str[inputLength - 1] === '=') inputLength--
  const paddingLength = str.length - inputLength
  const tailLength = inputLength % 4
  const mainLength = inputLength - tailLength // multiples of 4
  if (tailLength === 1) throw new SyntaxError(E_LENGTH)
  if (paddingLength > 3 || (paddingLength !== 0 && str.length % 4 !== 0)) {
    throw new SyntaxError(E_PADDING)
  }

  const alphabet = isURL ? BASE64URL : BASE64
  const helpers = isURL ? BASE64URL_HELPERS : BASE64_HELPERS

  if (!helpers.fromMap) {
    helpers.fromMap = new Int8Array(mapSize).fill(-1) // no regex input validation here, so we map all other bytes to -1 and recheck sign
    alphabet.forEach((c, i) => (helpers.fromMap[c.charCodeAt(0)] = i))
  }

  const m = helpers.fromMap

  const arr = new Uint8Array(Math.floor((inputLength * 3) / 4))
  let at = 0
  let i = 0

  if (nativeEncoder) {
    const codes = nativeEncoder.encode(str)
    if (codes.length !== str.length) throw new SyntaxError(E_CHAR) // non-ascii
    while (i < mainLength) {
      const a = (m[codes[i++]] << 18) | (m[codes[i++]] << 12) | (m[codes[i++]] << 6) | m[codes[i++]]
      if (a < 0) throw new SyntaxError(E_CHAR)
      arr[at++] = a >> 16
      arr[at++] = (a >> 8) & 0xff
      arr[at++] = a & 0xff
    }
  } else {
    while (i < mainLength) {
      const a =
        (m[str.charCodeAt(i++)] << 18) |
        (m[str.charCodeAt(i++)] << 12) |
        (m[str.charCodeAt(i++)] << 6) |
        m[str.charCodeAt(i++)]
      if (a < 0) throw new SyntaxError(E_CHAR)
      arr[at++] = a >> 16
      arr[at++] = (a >> 8) & 0xff
      arr[at++] = a & 0xff
    }
  }

  // Can be 0, 2 or 3, verified by padding checks already
  if (tailLength < 2) return arr // 0
  const ab = (m[str.charCodeAt(i++)] << 6) | m[str.charCodeAt(i++)]
  if (ab < 0) throw new SyntaxError(E_CHAR)
  arr[at++] = ab >> 4
  if (tailLength < 3) {
    if (ab & 0xf) throw new SyntaxError(E_LAST)
    return arr // 2
  }

  const c = m[str.charCodeAt(i++)]
  if (c < 0) throw new SyntaxError(E_CHAR)
  arr[at++] = ((ab << 4) & 0xff) | (c >> 2)
  if (c & 0x3) throw new SyntaxError(E_LAST)
  return arr // 3
}
