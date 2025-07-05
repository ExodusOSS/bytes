import { assert, assertUint8 } from './assert.js'

// TODO: make Buffer optional

// From Uint8Array or a Buffer, defaults to uint8
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
      if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('hex')
      return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('hex')
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
