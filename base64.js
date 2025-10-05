import { assert, assertUint8, assertEmptyRest } from './assert.js'
import { typedView } from './array.js'
import * as js from './fallback/base64.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

// base64:    A-Za-z0-9+/ and = if padding not disabled
// base64url: A-Za-z0-9_- and = if padding enabled

const { Buffer, atob } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const { toBase64: web64 } = Uint8Array.prototype // Modern engines have this

// For native Buffer codepaths only
const isBuffer = (x) => x.constructor === Buffer && Buffer.isBuffer(x)
const toBuffer = (x) => (isBuffer(x) ? x : Buffer.from(x.buffer, x.byteOffset, x.byteLength))

export function toBase64(x, { padding = true } = {}) {
  assertUint8(x)
  if (web64 && x.toBase64 === web64) return x.toBase64({ omitPadding: !padding }) // Modern
  if (!haveNativeBuffer) return js.toBase64(x, false, padding) // Fallback
  const res = toBuffer(x).toString('base64') // Older Node.js
  if (padding) return res
  const at = res.indexOf('=', res.length - 3)
  return at === -1 ? res : res.slice(0, at)
}

// NOTE: base64url omits padding by default
export function toBase64url(x, { padding = false } = {}) {
  assertUint8(x)
  if (web64 && x.toBase64 === web64) {
    return x.toBase64({ alphabet: 'base64url', omitPadding: !padding }) // Modern
  }

  if (!haveNativeBuffer) return js.toBase64(x, true, padding) // Fallback
  if (x.constructor === Buffer && Buffer.isBuffer(x)) return x.toString('base64url') // Older Node.js
  const res = toBuffer(x).toString('base64url') // Older Node.js
  return padding && res.length % 4 !== 0 ? res + '='.repeat(4 - (res.length % 4)) : res
}

// Unlike Buffer.from(), throws on invalid input (non-base64 symbols and incomplete chunks)
// Unlike Buffer.from() and Uint8Array.fromBase64(), does not allow spaces
// NOTE: Always operates in strict mode for last chunk

// By default accepts both padded and non-padded variants, only strict base64
export function fromBase64(str, options = {}) {
  if (typeof options === 'string') options = { format: options } // Compat due to usage, TODO: remove
  const { format = 'uint8', padding = 'both', ...rest } = options
  return fromBase64common(str, false, padding, format, rest)
}

// By default accepts only non-padded strict base64url
export function fromBase64url(str, { format = 'uint8', padding = false, ...rest } = {}) {
  return fromBase64common(str, true, padding, format, rest)
}

// By default accepts both padded and non-padded variants, base64 or base64url
export function fromBase64any(str, { format = 'uint8', padding = 'both', ...rest } = {}) {
  const isBase64url = !str.includes('+') && !str.includes('/') // likely to fail fast, as most input is non-url, also double scan is faster than regex
  return fromBase64common(str, isBase64url, padding, format, rest)
}

function fromBase64common(str, isBase64url, padding, format, rest) {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  assertEmptyRest(rest)
  const auto = padding === 'both' ? str.endsWith('=') : undefined
  // Older JSC supporting Uint8Array.fromBase64 lacks proper checks
  if (padding === true || auto === true) {
    assert(str.length % 4 === 0, 'Expected padded base64') // JSC misses this
    assert(str[str.length - 3] !== '=', 'Excessive padding') // no more than two = at the end
  } else if (padding === false || auto === false) {
    assert(str.length % 4 !== 1, 'Invalid base64 length') // JSC misses this in fromBase64
    if (padding === false) assert(!str.endsWith('='), 'Did not expect padding in base64 input') // inclusion is checked separately
  } else {
    throw new Error('Invalid padding option')
  }

  return typedView(fromBase64impl(str, isBase64url), format)
}

let fromBase64impl
if (Uint8Array.fromBase64) {
  // NOTICE: this is actually slower than our JS impl in older JavaScriptCore and (slightly) in SpiderMonkey, but faster on V8 and new JavaScriptCore
  fromBase64impl = (str, isBase64url) => {
    const alphabet = isBase64url ? 'base64url' : 'base64'
    assert(!/\s/u.test(str), `Invalid character in ${alphabet} input`) // all other chars are checked natively
    const padded = str.length % 4 > 0 ? `${str}${'='.repeat(4 - (str.length % 4))}` : str
    return Uint8Array.fromBase64(padded, { alphabet, lastChunkHandling: 'strict' })
  }
} else {
  fromBase64impl = (str, isBase64url) => {
    let arr
    if (!haveNativeBuffer && atob) {
      // atob is faster than manual parsing on Hermes
      if (isBase64url) {
        assert(!/[+/]/iu.test(str), `Invalid character in base64url input`) // atob verifies other invalid input
        str = str.replaceAll('-', '+').replaceAll('_', '/')
      }

      const raw = atob(str)
      const length = raw.length
      arr = new Uint8Array(length)
      for (let i = 0; i < length; i++) arr[i] = raw.charCodeAt(i)
    } else {
      const invalidRegex = isBase64url ? /[^0-9a-z=_-]/iu : /[^0-9a-z=+/]/iu
      assert(!invalidRegex.test(str), 'Invalid character in base64 input')
      const at = str.indexOf('=')
      if (at >= 0) assert(!/[^=]/iu.test(str.slice(at)), 'Invalid padding')
      arr = haveNativeBuffer ? Buffer.from(str, 'base64') : js.fromBase64(str)
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
