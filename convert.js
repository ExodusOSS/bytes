import { assert, assertUint8 } from './assert.js'

const { Buffer } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT

let hexArray
let hexMap

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
      // TODO: measure perf/optimize?
      if (!hexArray) hexArray = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
      return Array.from({ length: arr.length }, (_, i) => hexArray[arr[i]]).join('')
  }

  throw new TypeError('Unexpected format')
}

// Unlike Buffer.from(), throws on invalid input
export function fromHex(arg, format = 'uint8') {
  if (Uint8Array.fromHex) return fromUint8Super(Uint8Array.fromHex(arg), format)
  if (typeof arg !== 'string') throw new TypeError('Input is not a string')
  assert(arg.length % 2 === 0 && !/[^0-9a-f]/ui.test(arg), 'Input is not a hex string')
  if (haveNativeBuffer) return fromUint8Super(Buffer.from(arg, 'hex'), format)
  // TODO: measure perf/optimize?
  if (!hexMap) {
    hexMap = Object.create(null)
    for (let i = 0; i < 256; i++) hexMap[i.toString(16).padStart(2, '0')] = i
  }
  const length = arg.length / 2
  arg = arg.toLowerCase()
  const arr = Uint8Array.from({ length }, (_, i) => hexMap[arg[2 * i] + arg[2 * i + 1]])
  return fromUint8Super(arr, format)
}
