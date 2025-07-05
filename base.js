import { assert, assertUint8 } from './assert.js'
import { fromUint8Super } from './convert.js'

// TODO: make Buffer optional

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
    assert(arg.length % 4 === 0, 'Invalid padded base64 length') // JSC misses this too
    assert(arg[arg.length - 3] !== '=', 'Excessive padding') // no more than two = at the end
  }

  if (Uint8Array.fromBase64) {
    if (!/[^0-9a-z=+/]/ui.test(arg)) return fromUint8Super(Uint8Array.fromBase64(arg), format)
    if (/[^0-9a-z_-]/ui.test(arg)) throw new Error('Invalid character in base64/base64url input')
    return fromUint8Super(Uint8Array.fromBase64(arg, { alphabet: 'base64url' }), format)
  }

  assert(!/=[^=]/ui.test(arg), 'Invalid input after base64 padding')

  if (!/[^0-9a-z=+/]/ui.test(arg)) return fromUint8Super(Buffer.from(arg, 'base64'), format) // base64
  if (!/[^0-9a-z_-]/ui.test(arg)) return fromUint8Super(Buffer.from(arg, 'base64'), format) // base64url
  throw new Error('Invalid character in base64/base64url input')
}
