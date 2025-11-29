import { assertUint8, assertEmptyRest } from './assert.js'
import { typedView } from './array.js'
import * as ascii from './fallback/ascii.js'
import * as js from './fallback/base64.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

// base64:    A-Za-z0-9+/ and = if padding not disabled
// base64url: A-Za-z0-9_- and = if padding enabled

const { Buffer, atob, btoa } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const { toBase64: web64 } = Uint8Array.prototype // Modern engines have this

const { E_CHAR, E_PADDING, E_LENGTH, E_LAST } = js

// faster only on Hermes (and a little in old Chrome), js path beats it on normal engines
const shouldUseBtoa = btoa && Boolean(globalThis.HermesInternal)
const shouldUseAtob = atob && Boolean(globalThis.HermesInternal)

// For native Buffer codepaths only
const isBuffer = (x) => x.constructor === Buffer && Buffer.isBuffer(x)
const toBuffer = (x) => (isBuffer(x) ? x : Buffer.from(x.buffer, x.byteOffset, x.byteLength))

function maybeUnpad(res, padding) {
  if (padding) return res
  const at = res.indexOf('=', res.length - 3)
  return at === -1 ? res : res.slice(0, at)
}

function maybePad(res, padding) {
  return padding && res.length % 4 !== 0 ? res + '='.repeat(4 - (res.length % 4)) : res
}

const toUrl = (x) => x.replaceAll('+', '-').replaceAll('/', '_')
const fromUrl = (x) => x.replaceAll('-', '+').replaceAll('_', '/')
const haveWeb = (x) => web64 && x.toBase64 === web64

export function toBase64(x, { padding = true } = {}) {
  assertUint8(x)
  if (haveWeb(x)) return padding ? x.toBase64() : x.toBase64({ omitPadding: !padding }) // Modern, optionless is slightly faster
  if (haveNativeBuffer) return maybeUnpad(toBuffer(x).toString('base64'), padding) // Older Node.js
  if (shouldUseBtoa) return maybeUnpad(btoa(ascii.decode(x)), padding)
  return js.toBase64(x, false, padding) // Fallback
}

// NOTE: base64url omits padding by default
export function toBase64url(x, { padding = false } = {}) {
  assertUint8(x)
  if (haveWeb(x)) return x.toBase64({ alphabet: 'base64url', omitPadding: !padding }) // Modern
  if (haveNativeBuffer) return maybePad(toBuffer(x).toString('base64url'), padding) // Older Node.js
  if (shouldUseBtoa) return maybeUnpad(toUrl(btoa(ascii.decode(x))), padding)
  return js.toBase64(x, true, padding) // Fallback
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
    if (str.length % 4 !== 0) throw new SyntaxError(E_PADDING) // JSC misses this
    if (str[str.length - 3] === '=') throw new SyntaxError(E_PADDING) // no more than two = at the end
  } else if (padding === false || auto === false) {
    if (str.length % 4 === 1) throw new SyntaxError(E_LENGTH) // JSC misses this in fromBase64
    if (padding === false && str.endsWith('=')) {
      throw new SyntaxError('Did not expect padding in base64 input') // inclusion is checked separately
    }
  } else {
    throw new TypeError('Invalid padding option')
  }

  return typedView(fromBase64impl(str, isBase64url), format)
}

// ASCII whitespace is U+0009 TAB, U+000A LF, U+000C FF, U+000D CR, or U+0020 SPACE
const ASCII_WHITESPACE = /[\t\n\f\r ]/ // non-u for JSC perf

let fromBase64impl
if (Uint8Array.fromBase64) {
  // NOTICE: this is actually slower than our JS impl in older JavaScriptCore and (slightly) in SpiderMonkey, but faster on V8 and new JavaScriptCore
  fromBase64impl = (str, isBase64url) => {
    const alphabet = isBase64url ? 'base64url' : 'base64'
    if (ASCII_WHITESPACE.test(str)) throw new SyntaxError(E_CHAR) // all other chars are checked natively
    const padded = str.length % 4 > 0 ? `${str}${'='.repeat(4 - (str.length % 4))}` : str
    return Uint8Array.fromBase64(padded, { alphabet, lastChunkHandling: 'strict' })
  }
} else {
  fromBase64impl = (str, isBase64url) => {
    let arr
    if (haveNativeBuffer) {
      const invalidRegex = isBase64url ? /[^0-9a-z=_-]/iu : /[^0-9a-z=+/]/iu
      if (invalidRegex.test(str)) throw new SyntaxError(E_CHAR)
      const at = str.indexOf('=')
      if (at >= 0 && /[^=]/iu.test(str.slice(at))) throw new SyntaxError(E_PADDING)
      arr = Buffer.from(str, 'base64')
    } else if (shouldUseAtob) {
      // atob is faster than manual parsing on Hermes
      if (isBase64url) {
        if (/[\t\n\f\r +/]/.test(str)) throw new SyntaxError(E_CHAR) // atob verifies other invalid input
        str = fromUrl(str)
      } else {
        if (ASCII_WHITESPACE.test(str)) throw new SyntaxError(E_CHAR) // all other chars are checked natively
      }

      try {
        arr = ascii.encodeLatin1(atob(str))
      } catch {
        throw new SyntaxError(E_CHAR) // convert atob errors
      }
    } else {
      return js.fromBase64(str, isBase64url) // early return to skip last chunk verification, it's already validated in js
    }

    if (arr.length % 3 !== 0) {
      // Check last chunk to be strict if it was incomplete
      const expected = toBase64(arr.subarray(-(arr.length % 3)))
      const end = str.length % 4 === 0 ? str.slice(-4) : str.slice(-(str.length % 4)).padEnd(4, '=')
      const actual = isBase64url ? fromUrl(end) : end
      if (expected !== actual) throw new SyntaxError(E_LAST)
    }

    return arr
  }
}
