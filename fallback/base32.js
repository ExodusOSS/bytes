import { assertUint8 } from '../assert.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

const { Buffer, TextDecoder } = globalThis
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const nativeDecoder = isNative(TextDecoder) ? new TextDecoder() : null
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
  throw new Error('Unimplemented')
}
