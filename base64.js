import { assert, assertUint8 } from './assert.js'
import { fromTypedArray } from './array.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

// base64:    A-Za-z0-9+/ and =
// base64url: A-Za-z0-9_-

const { Buffer, atob } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const { toBase64: web64 } = Uint8Array.prototype // Modern engines have this

export function toBase64(x) {
  assertUint8(x)
  if (web64 && x.toBase64 === web64) return x.toBase64() // Modern
  if (!haveNativeBuffer) return toBase64js(x, BASE64, true) // Fallback
  if (x.constructor === Buffer && Buffer.isBuffer(x)) return x.toString('base64') // Older Node.js
  return Buffer.from(x.buffer, x.byteOffset, x.byteLength).toString('base64') // Older Node.js
}

// NOTE: base64url omits padding
export function toBase64url(x) {
  assertUint8(x)
  if (web64 && x.toBase64 === web64) return x.toBase64({ alphabet: 'base64url', omitPadding: true }) // Modern
  if (!haveNativeBuffer) return toBase64js(x, BASE64URL, false) // Fallback
  if (x.constructor === Buffer && Buffer.isBuffer(x)) return x.toString('base64url') // Older Node.js
  return Buffer.from(x.buffer, x.byteOffset, x.byteLength).toString('base64url') // Older Node.js
}

// Unlike Buffer.from(), throws on invalid input (non-base64 symbols and incomplete chunks)
// Unlike Buffer.from() and Uint8Array.fromBase64(), does not allow spaces
// NOTE: Always operates in strict mode for last chunk

// Accepts both padded and non-padded variants, only strict base64
export function fromBase64(str, format = 'uint8') {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')

  // These checks should be needed only for Buffer path, not Uint8Array.fromBase64 path, but JSC lacks proper checks
  assert(str.length % 4 !== 1, 'Invalid base64 length') // JSC misses this in fromBase64
  if (str.endsWith('=')) {
    assert(str.length % 4 === 0, 'Invalid padded length') // JSC misses this too
    assert(str[str.length - 3] !== '=', 'Excessive padding') // no more than two = at the end
  }

  return fromTypedArray(fromBase64common(str, false), format)
}

// Accepts both only non-padded strict base64url
export function fromBase64url(str, format = 'uint8') {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')

  // These checks should be needed only for Buffer path, not Uint8Array.fromBase64 path, but JSC lacks proper checks
  assert(str.length % 4 !== 1, 'Invalid base64 length') // JSC misses this in fromBase64
  assert(!str.endsWith('='), 'Did not expect padding in base64url input') // inclusion is checked separately

  return fromTypedArray(fromBase64common(str, true), format)
}

let fromBase64common
if (Uint8Array.fromBase64) {
  // NOTICE: this is actually slower than our JS impl in older JavaScriptCore and (slightly) in SpiderMonkey, but faster on V8 and new JavaScriptCore
  fromBase64common = (str, isBase64url) => {
    assert(!/\s/u.test(str), 'Invalid character in base64url input') // all other chars are checked natively
    const alphabet = isBase64url ? 'base64url' : 'base64'
    const padded = str.length % 4 > 0 ? `${str}${'='.repeat(4 - (str.length % 4))}` : str
    return Uint8Array.fromBase64(padded, { alphabet, lastChunkHandling: 'strict' })
  }
} else {
  fromBase64common = (str, isBase64url) => {
    if (isBase64url) {
      assert(!/[^0-9a-z_-]/iu.test(str), 'Invalid character in base64url input')
    } else {
      assert(!/[^0-9a-z=+/]/iu.test(str), 'Invalid character in base64 input')
    }

    let arr
    if (!haveNativeBuffer && atob) {
      // atob is faster than manual parsing on Hermes
      const raw = atob(isBase64url ? str.replaceAll('-', '+').replaceAll('_', '/') : str)
      arr = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
    } else {
      // base64url is already checked to have no padding via a regex above
      if (!isBase64url) {
        const at = str.indexOf('=')
        if (at >= 0) assert(!/[^=]/iu.test(str.slice(at)), 'Invalid padding')
      }

      arr = haveNativeBuffer ? Buffer.from(str, 'base64') : fromBase64js(str)
    }

    if (arr.length % 3 !== 0) {
      // Check last chunk to be strict if it was incomplete
      const expected = toBase64(arr.subarray(-(arr.length % 3)))
      const end = str.length % 4 === 0 ? str.slice(-4) : str.slice(-(str.length % 4)).padEnd(4, '=')
      const actual = isBase64url ? end.replaceAll('-', '+').replaceAll('_', '/') : end
      if (expected !== actual) throw new Error('Invalid last chunk')
    }

    return arr
  }
}

const BASE64 = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/']
const BASE64URL = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_']

// We construct output by concatenating chars, this seems to be fine enough on modern JS engines
function toBase64js(arr, alphabet, padding) {
  assertUint8(arr)
  const fullChunks = Math.floor(arr.length / 3)
  const fullChunksBytes = fullChunks * 3
  let o = ''
  let i = 0

  // Fast path for complete blocks
  // This whole loop can be commented out, the algorithm won't change, it's just an optimization of the next loop
  for (; i < fullChunksBytes; i += 3) {
    const a = arr[i]
    const b = arr[i + 1]
    const c = arr[i + 2]
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
  let carry = 0
  let shift = 2 // First byte needs to be shifted by 2 to get 6 bits
  for (; i < arr.length; i++) {
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
  if (padding) o += ['', '==', '='][arr.length - fullChunksBytes]

  return o
}

// Assumes no chars after =, checked
let fromBase64jsMap

function fromBase64js(str) {
  const map = fromBase64jsMap || new Array(256)
  if (!fromBase64jsMap) {
    fromBase64jsMap = map
    BASE64.forEach((c, i) => (map[c.charCodeAt(0)] = i))
    map['-'.charCodeAt(0)] = 62 // two last chars of BASE64URL
    map['_'.charCodeAt(0)] = 63 // two last chars of BASE64URL
  }

  let inputLength = str.length
  while (str[inputLength - 1] === '=') inputLength--

  const arr = new Uint8Array(Math.floor((inputLength * 3) / 4))
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
    arr[at++] = tmp >> 16
    arr[at++] = (tmp >> 8) & 0xff
    arr[at++] = tmp & 0xff
    i += 4
  }

  if (tailLength === 3) {
    tmp =
      (map[str.charCodeAt(i)] << 10) |
      (map[str.charCodeAt(i + 1)] << 4) |
      (map[str.charCodeAt(i + 2)] >> 2)
    arr[at++] = (tmp >> 8) & 0xff
    arr[at++] = tmp & 0xff
  } else if (tailLength === 2) {
    tmp = (map[str.charCodeAt(i)] << 2) | (map[str.charCodeAt(i + 1)] >> 4)
    arr[at++] = tmp & 0xff
  }

  return arr
}
