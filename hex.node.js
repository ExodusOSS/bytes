import { typedView } from './array.js'
import { assertU8, fromUint8, E_STRING } from './fallback/_utils.js'
import { E_HEX } from './fallback/hex.js'

if (Buffer.TYPED_ARRAY_SUPPORT) throw new Error('Unexpected Buffer polyfill')

const { toHex: webHex } = Uint8Array.prototype // Modern engines have this
const denoBug = Buffer.from('ag', 'hex').length > 0

export function toHex(arr) {
  assertU8(arr)
  if (arr.length === 0) return ''
  if (webHex && arr.toHex === webHex) return arr.toHex()
  if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.hexSlice(0, arr.byteLength)
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).hexSlice(0, arr.byteLength)
}

// Unlike Buffer.from(), throws on invalid input
export const fromHex = Uint8Array.fromHex
  ? (str, format = 'uint8') => fromUint8(Uint8Array.fromHex(str), format)
  : (str, format = 'uint8') => {
      if (typeof str !== 'string') throw new TypeError(E_STRING)
      if (str.length % 2 !== 0) throw new SyntaxError(E_HEX)
      if (denoBug && /[^\dA-Fa-f]/.test(str)) throw new SyntaxError(E_HEX)

      if (str.length <= 128) {
        const u8 = new Uint8Array(Buffer.from(str, 'hex')) // just copy to not access .buffer
        if (u8.length * 2 !== str.length) throw new SyntaxError(E_HEX)
        return typedView(u8, format)
      }

      const length = str.length / 2
      const u8 = new Uint8Array(length)
      const count = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).hexWrite(str, 0, length)
      if (count !== length) throw new SyntaxError(E_HEX) // will stop on first non-hex character, so we can just validate length
      return typedView(u8, format)
    }
