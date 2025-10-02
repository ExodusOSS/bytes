import { assertTypedArray } from './assert.js'
import { typedView } from './array.js'
import * as js from './fallback/hex.js'

const { Buffer } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const { toHex: webHex } = Uint8Array.prototype // Modern engines have this

export function toHex(arr) {
  assertTypedArray(arr)
  if (!(arr instanceof Uint8Array)) arr = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
  if (arr.length === 0) return ''
  if (webHex && arr.toHex === webHex) return arr.toHex()
  if (!haveNativeBuffer) return js.toHex(arr)
  if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('hex')
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('hex')
}

// Unlike Buffer.from(), throws on invalid input
export const fromHex = Uint8Array.fromHex
  ? (str, format = 'uint8') => typedView(Uint8Array.fromHex(str), format)
  : (str, format = 'uint8') => typedView(js.fromHex(str), format)
