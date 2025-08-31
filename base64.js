import { assert, assertUint8 } from './assert.js'
import { fromTypedArray } from './convert.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

// base64:    A-Za-z0-9+/ and =
// base64url: A-Za-z0-9_-

const { Buffer } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT

export function toBase64(arr) {
  assertUint8(arr)
  if (Uint8Array.prototype.toBase64 && arr.toBase64 === Uint8Array.prototype.toBase64) {
    return arr.toBase64()
  }

  if (haveNativeBuffer) {
    if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('base64')
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64')
  }

  return toBase64js(arr, BASE64, true)
}

// NOTE: base64url omits padding
export function toBase64url(arr) {
  assertUint8(arr)
  if (Uint8Array.prototype.toBase64 && arr.toBase64 === Uint8Array.prototype.toBase64) {
    return arr.toBase64({ alphabet: 'base64url', omitPadding: true })
  }

  if (haveNativeBuffer) {
    if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('base64url')
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64url')
  }

  return toBase64js(arr, BASE64URL, false)
}

// Unlike Buffer.from(), throws on invalid input (non-base64 symbols and incomplete chunks)
// Unlike Buffer.from() and Uint8Array.fromBase64(), does not allow spaces
// Unlike Uint8Array.fromBase64(), accepts both base64 and base64url
// NOTE: Always operates in strict mode for last chunk

export function fromBase64(arg, format = 'uint8') {
  if (typeof arg !== 'string') throw new TypeError('Input is not a string')

  // These checks should be needed only for Buffer path, not Uint8Array.fromBase64 path, but JSC lacks proper checks
  assert(arg.length % 4 !== 1, 'Invalid base64 length') // JSC misses this in fromBase64
  if (arg.endsWith('=')) {
    assert(arg.length % 4 === 0, 'Invalid padded length') // JSC misses this too
    assert(arg[arg.length - 3] !== '=', 'Excessive padding') // no more than two = at the end
  }

  assert(!/[^0-9a-z=+/]/ui.test(arg), 'Invalid character in base64 input')
  return fromTypedArray(fromBase64common(arg, false), format)
}

export function fromBase64url(arg, format = 'uint8') {
  if (typeof arg !== 'string') throw new TypeError('Input is not a string')

  // These checks should be needed only for Buffer path, not Uint8Array.fromBase64 path, but JSC lacks proper checks
  assert(arg.length % 4 !== 1, 'Invalid base64 length') // JSC misses this in fromBase64
  assert(!arg.includes('='), 'Did not expect padding in base64url input')

  assert(!/[^0-9a-z_-]/ui.test(arg), 'Invalid character in base64url input')
  return fromTypedArray(fromBase64common(arg, true), format)
}

function checkLastBase64Chunk(s, arr, isBase64url = false) {
  if (arr.length % 3 === 0) return // last chunk is complete
  // Check last chunk to be strict
  const expected = toBase64(arr.subarray(-(arr.length % 3)))
  const last = (s.length % 4 === 0) ? s.slice(-4) : s.slice(-(s.length % 4)).padEnd(4, '=')
  const actual = isBase64url ? last.replaceAll('-', '+').replaceAll('_', '/') : last
  if (expected !== actual) throw new Error('Invalid last chunk')
}

const { atob } = globalThis

function fromBase64common(arg, isBase64url) {
  if (Uint8Array.fromBase64) {
    const options = { alphabet: isBase64url ? 'base64url' : 'base64', lastChunkHandling: 'strict' }
    const padded = arg.length % 4 !== 0 ? `${arg}${'='.repeat(4 - arg.length % 4)}` : arg
    return Uint8Array.fromBase64(padded, options)
  }

  if (!haveNativeBuffer && atob) {
    // atob is faster than manual parsing on Hermes
    const str = atob(isBase64url ? arg.replaceAll('-', '+').replaceAll('_', '/') : arg)
    const arr = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i)
    checkLastBase64Chunk(arg, arr, isBase64url)
    return arr
  }

  // FIXME: use a better impl when Buffer.from is not native?
  assert(!arg.includes('=') || !/=[^=]/ui.test(arg), 'Invalid input after padding')
  const arr = haveNativeBuffer ? Buffer.from(arg, 'base64') : fromBase64js(arg)
  checkLastBase64Chunk(arg, arr, isBase64url)
  return arr
}

const BASE64 = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/']
const BASE64URL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_']

// We construct output by concatenating chars, this seems to be fine enough on modern JS engines
function toBase64js(arr, alphabet, padding) {
  assertUint8(arr)
  const fullChunks = Math.floor(arr.length / 3)
  const fullChunksBytes = fullChunks * 3
  let o = '', i = 0

  // Fast path for complete blocks
  // This whole loop can be commented out, the algorithm won't change, it's just an optimization of the next loop
  for (; i < fullChunksBytes; i += 3) {
    let a = arr[i], b = arr[i + 1], c = arr[i + 2]
    if (a === 0 && b === 0 && c === 0) {
      o += 'AAAA'
    } else {
      o += alphabet[a >> 2] // 8 - 6 = 2 left
      o += alphabet[((a & 0x3) << 4) | (b >> 4)] // 2 + 8 - 6 = 4 left
      o += alphabet[((b & 0xf) << 2) | (c >> 6)] // 4 + 8 - 6 = 6 left
      o += alphabet[c & 0x3f] // 6 - 6 = 0 left
    }
  }

  // If we have something left, process it with a full algo
  let carry = 0, shift = 2 // First byte needs to be shifted by 2 to get 6 bits
  for (; i < arr.length; i++) {
    let x = arr[i]
    o += alphabet[carry | (x >> shift)] // shift >= 2, so this fits
    if (shift === 6) {
      shift = 0
      o += alphabet[x & 0x3f]
    }
    carry = (x << (6 - shift)) & 0x3f
    shift += 2 // Each byte prints 6 bits and leaves 2 bits
  }
  if (shift !== 2) o += alphabet[carry] // shift 2 means we have no carry left
  if (padding) o += ['', '==', '='][arr.length - fullChunksBytes]

  return o
}

// Assumes no chars after =, checked
let fromBase64jsMap
function fromBase64js(str) {
  const map = fromBase64jsMap || Array(256)
  if (!fromBase64jsMap) {
    fromBase64jsMap = map
    BASE64.forEach((c, i) => (map[c.charCodeAt(0)] = i))
    map['-'.charCodeAt(0)] = 62 // two last chars of BASE64
    map['_'.charCodeAt(0)] = 63 // two last chars of BASE64
  }

  let inputLength = str.length
  while (str[inputLength - 1] === '=') inputLength--

  const arr = new Uint8Array(Math.floor(inputLength * 3 / 4))
  const tailLength = inputLength % 4
  const mainLength = inputLength - tailLength // multiples of 4

  let at = 0
  let i = 0
  let tmp

  while (i < mainLength) {
    tmp =
      (map[str.charCodeAt(i)] << 18) |
      (map[str.charCodeAt(i + 1)] << 12) |
      (map[str.charCodeAt(i + 2)] << 6) |
      map[str.charCodeAt(i + 3)]
    arr[at++] = (tmp >> 16)
    arr[at++] = (tmp >> 8) & 0xFF
    arr[at++] = tmp & 0xFF
    i += 4
  }

  if (tailLength === 3) {
    tmp =
      (map[str.charCodeAt(i)] << 10) |
      (map[str.charCodeAt(i + 1)] << 4) |
      (map[str.charCodeAt(i + 2)] >> 2)
    arr[at++] = (tmp >> 8) & 0xFF
    arr[at++] = tmp & 0xFF
  } else if (tailLength === 2) {
    tmp =
      (map[str.charCodeAt(i)] << 2) |
      (map[str.charCodeAt(i + 1)] >> 4)
    arr[at++] = tmp & 0xFF
  }

  return arr
}
