import { assert, assertUint8 } from './assert.js'
import { fromUint8Super } from './convert.js'

// TODO: make Buffer optional

// See https://datatracker.ietf.org/doc/html/rfc4648

// base64:    A-Za-z0-9+/ and =
// base64url: A-Za-z0-9_-

export function toBase64(arr) {
  assertUint8(arr)
  if (Uint8Array.prototype.toBase64 && arr.toBase64 === Uint8Array.prototype.toBase64) {
    return arr.toBase64()
  }

  if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('base64')
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64')
}

// NOTE: base64url omits padding
export function toBase64url(arr) {
  assertUint8(arr)
  if (Uint8Array.prototype.toBase64 && arr.toBase64 === Uint8Array.prototype.toBase64) {
    return arr.toBase64({ alphabet: 'base64url', omitPadding: true })
  }

  return toBase64(arr).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

// Unlike Buffer.from(), throws on invalid input (non-base64 symbols and incomplete chunks)
// Unlike Buffer.from() and Uint8Array.fromBase64(), does not allow spaces
// Unlike Uint8Array.fromBase64(), accepts both base64 and base64url
// NOTE: base64url does not allow padding!
// TODO: add a strict mode? (we allow overflow by default, like VR==)
// TODO: add 'alphabet' option to enforce input format?
export function fromBase64(arg, format = 'uint8') {
  if (typeof arg !== 'string') throw new TypeError('Input is not a string')

  // These checks should be needed only for Buffer path, not Uint8Array.fromBase64 path, but JSC lacks proper checks
  assert(arg.length % 4 !== 1, 'Invalid base64 length') // JSC misses this in fromBase64
  if (arg.endsWith('=')) {
    assert(arg.length % 4 === 0, 'Invalid padded length') // JSC misses this too
    assert(arg[arg.length - 3] !== '=', 'Excessive padding') // no more than two = at the end
  }

  if (Uint8Array.fromBase64) {
    if (!/[^0-9a-z=+/]/ui.test(arg)) return fromUint8Super(Uint8Array.fromBase64(arg), format)
    if (/[^0-9a-z_-]/ui.test(arg)) throw new Error('Invalid character in base64/base64url input')
    return fromUint8Super(Uint8Array.fromBase64(arg, { alphabet: 'base64url' }), format)
  }

  assert(!/=[^=]/ui.test(arg), 'Invalid input after padding')

  if (!/[^0-9a-z=+/]/ui.test(arg)) return fromUint8Super(Buffer.from(arg, 'base64'), format) // base64
  if (!/[^0-9a-z_-]/ui.test(arg)) return fromUint8Super(Buffer.from(arg, 'base64'), format) // base64url
  throw new Error('Invalid character in base64/base64url input')
}

const BASE32 = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567']

// We construct output by concatenating chars, this seems to be fine enough on modern JS engines
export function toBase32(arr) {
  assertUint8(arr)
  const fullChunks = Math.floor(arr.length / 5)
  const fullChunksBytes = fullChunks * 5
  let o = '', i = 0

  // Fast path for complete blocks
  // This whole loop can be commented out, the algorithm won't change, it's just an optimization of the next loop
  for (; i < fullChunksBytes; i += 5) {
    let a = arr[i], b = arr[i + 1], c = arr[i + 2], d = arr[i + 3], e = arr[i + 4]
    if (a === 0 && b === 0 && c === 0 && d === 0 && e === 0) {
      o += 'AAAAAAAA'
    } else {
      o += BASE32[a >> 3] // 8 - 5 = 3 left
      o += BASE32[((a & 0x7) << 2) | (b >> 6)] // 3 + 8 - 5 = 6 left
      o += BASE32[(b >> 1) & 0x1f] // 6 - 5 = 1 left
      o += BASE32[((b & 0x1) << 4) | (c >> 4)] // 1 + 8 - 5 = 4 left
      o += BASE32[((c & 0xf) << 1) | (d >> 7)] // 4 + 8 - 5 = 7 left
      o += BASE32[(d >> 2) & 0x1f] // 7 - 5 = 2 left
      o += BASE32[((d & 0x3) << 3) | (e >> 5)] // 2 + 8 - 5 = 5 left
      o += BASE32[e & 0x1f] // 5 - 5 = 0 left
    }
  }

  // If we have something left, process it with a full algo
  let carry = 0, shift = 3 // First byte needs to be shifted by 3 to get 5 bits
  for (; i < arr.length; i++) {
    let x = arr[i]
    o += BASE32[(carry | (x >> shift)) & 0x1f]
    if (shift > 5) {
      shift -= 5
      o += BASE32[(x >> shift) & 0x1f]
    }
    carry = x << (5 - shift)
    shift += 3 // Each byte prints 5 bits and leaves 3 bits
  }
  if (shift !== 3) o += BASE32[carry & 0x1f] // shift 3 means we have no carry left
  o += ['', '======', '====', '===', '='][arr.length - fullChunksBytes]

  return o
}

// TODO: fromBase32, toBase58, fromBase58, better base64 fallback
