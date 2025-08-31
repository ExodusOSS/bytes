import { assert, assertUint8 } from './assert.js'

const { Buffer } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT

let hexArray
let dehexArray

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
      if (haveNativeBuffer) {
        if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('hex')
        return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('hex')
      }
      if (!hexArray) hexArray = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
      let out = ''
      for (let i = 0; i < arr.length; i++) out += hexArray[arr[i]]
      return out
  }

  throw new TypeError('Unexpected format')
}

// Unlike Buffer.from(), throws on invalid input
export function fromHex(arg, format = 'uint8') {
  if (Uint8Array.fromHex) return fromUint8Super(Uint8Array.fromHex(arg), format)
  if (typeof arg !== 'string') throw new TypeError('Input is not a string')
  assert(arg.length % 2 === 0, 'Input is not a hex string')
  if (haveNativeBuffer) {
    assert(!/[^0-9a-f]/ui.test(arg), 'Input is not a hex string')
    return fromUint8Super(Buffer.from(arg, 'hex'), format)
  }

  if (!dehexArray) {
    dehexArray = new Array(103) // f is 102
    for (let i = 0; i < 16; i++) {
      const s = i.toString(16)
      dehexArray[s.charCodeAt(0)] = dehexArray[s.toUpperCase().charCodeAt(0)] = i
    }
  }

  const arr = new Uint8Array(arg.length / 2)
  let j = 0
  for (let i = 0; i < arr.length; i++) {
    const a = dehexArray[arg.charCodeAt(j++)] * 16 + dehexArray[arg.charCodeAt(j++)]
    if (!a && Number.isNaN(a)) throw new Error('Input is not a hex string')
    arr[i] = a
  }

  return fromUint8Super(arr, format)
}
