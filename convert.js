import { assert, assertUint8 } from './assert.js'

// TODO: make Buffer optional

// base64:    A-Za-z0-9+/ and =
// base64url: A-Za-z0-9_-

// From Uint8Array or a Buffer, defaults to uint8
// NOTE: base64url omits padding
export function fromUint8Super(arr, format = 'uint8') {
  assertUint8(arr)
  switch (format) {
    case 'uint8':
      if (arr.constructor === Uint8Array) return arr // fast path
      return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    case 'buffer':
      if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr
      return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
    case 'hex':
      if (Uint8Array.prototype.toHex && arr.toHex === Uint8Array.prototype.toHex) return arr.toHex()
      if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString(format)
      return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString(format)
    case 'base64':
      if (Uint8Array.prototype.toBase64 && arr.toBase64 === Uint8Array.prototype.toBase64) {
        return arr.toBase64()
      }

      if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString(format)
      return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString(format)
    case 'base64url':
      if (Uint8Array.prototype.toBase64 && arr.toBase64 === Uint8Array.prototype.toBase64) {
        return arr.toBase64({ alphabet: 'base64url', omitPadding: true })
      }

      return fromUint8Super(arr, 'base64')
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '')
  }

  throw new TypeError('Unexpected format')
}

// Unlike Buffer.from(), throws on invalid input
export function fromHex(arg, format = 'uint8') {
  if (Uint8Array.fromHex) return fromUint8Super(Uint8Array.fromHex(arg), format)
  if (typeof arg !== 'string') throw new TypeError('Input is not a string')
  assert(arg.length % 2 === 0 && !/[^0-9a-f]/ui.test(arg), 'Input is not a hex string')
  return fromUint8Super(Buffer.from(arg, 'hex'), format)
}

// Unlike Buffer.from(), throws on invalid input (non-base64 symbols and incomplete chunks)
// Unlike Buffer.from() and Uint8Array.fromBase64(), does not allow spaces
// Unlike Uint8Array.fromBase64(), accepts both base64 and base64url
// TODO: add a strict mode? (we allow overflow by default, like VR==)
// TODO: add 'alphabet' option to enforce input format?
export function fromBase64(arg, format = 'uint8') {
  if (typeof arg !== 'string') throw new TypeError('Input is not a string')

  // These checks should be needed only for Buffer path, not Uint8Array.fromBase64 path, but JSC lacks proper checks
  assert(arg.length % 4 !== 1, 'Invalid base64 length') // JSC misses this in fromBase64
  if (arg.endsWith('=')) {
    assert(arg.length % 4 === 0, 'Invalid padded base64 length') // JSC misses this too
    assert(arg[arg.length - 3] !== '=', 'Excessive padding')
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
