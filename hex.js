import { assertTypedArray, assert } from './assert.js'
import { fromTypedArray } from './array.js'

const { Buffer } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const { toHex: webHex } = Uint8Array.prototype // Modern engines have this

let hexArray
let dehexArray

export function toHex(arr) {
  assertTypedArray(arr)
  if (!(arr instanceof Uint8Array)) arr = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
  if (webHex && arr.toHex === webHex) return arr.toHex()
  if (haveNativeBuffer) {
    if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('hex')
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('hex')
  }

  if (!hexArray) hexArray = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
  let out = ''
  for (let i = 0; i < arr.length; i++) out += hexArray[arr[i]]
  return out
}

// Unlike Buffer.from(), throws on invalid input
let fromHex
if (Uint8Array.fromHex) {
  fromHex = (str, format = 'uint8') => fromTypedArray(Uint8Array.fromHex(str), format)
} else {
  fromHex = (str, format = 'uint8') => {
    if (typeof str !== 'string') throw new TypeError('Input is not a string')
    assert(str.length % 2 === 0, 'Input is not a hex string')

    // We don't use native Buffer impl, as rechecking input make it slower than pure js
    // This path is used only on older engines though

    if (!dehexArray) {
      dehexArray = new Array(103) // f is 102
      for (let i = 0; i < 16; i++) {
        const s = i.toString(16)
        dehexArray[s.charCodeAt(0)] = dehexArray[s.toUpperCase().charCodeAt(0)] = i
      }
    }

    const arr = new Uint8Array(str.length / 2)
    let j = 0
    for (let i = 0; i < arr.length; i++) {
      const a = dehexArray[str.charCodeAt(j++)] * 16 + dehexArray[str.charCodeAt(j++)]
      if (!a && Number.isNaN(a)) throw new Error('Input is not a hex string')
      arr[i] = a
    }

    return fromTypedArray(arr, format)
  }
}

export { fromHex }
