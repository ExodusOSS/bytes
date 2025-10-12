import { assertUint8 } from './assert.js'
import { typedView } from './array.js'
import * as js from './fallback/hex.js'

const { Buffer } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const { toHex: webHex } = Uint8Array.prototype // Modern engines have this

const { E_HEX } = js

export function toHex(arr) {
  assertUint8(arr)
  if (arr.length === 0) return ''
  if (webHex && arr.toHex === webHex) return arr.toHex()
  if (!haveNativeBuffer) return js.toHex(arr)
  if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('hex')
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('hex')
}

// Unlike Buffer.from(), throws on invalid input
export const fromHex = Uint8Array.fromHex
  ? (str, format = 'uint8') => typedView(Uint8Array.fromHex(str), format)
  : haveNativeBuffer
    ? (str, format = 'uint8') => {
        if (typeof str !== 'string') throw new TypeError('Input is not a string')
        if (str.length % 2 !== 0) throw new SyntaxError(E_HEX)
        const buf = Buffer.from(str, 'hex') // will stop on first non-hex character, so we can just validate length
        if (buf.length * 2 !== str.length) throw new SyntaxError(E_HEX)
        return typedView(buf, format)
      }
    : (str, format = 'uint8') => typedView(js.fromHex(str), format)
