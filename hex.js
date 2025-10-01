import { assertTypedArray, assert } from './assert.js'
import { typedView } from './array.js'

const { Buffer, TextEncoder } = globalThis // Buffer is optional, only used when native
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const { toHex: webHex } = Uint8Array.prototype // Modern engines have this
const nativeEncoder = TextEncoder?.toString().includes('[native code]') ? new TextEncoder() : null

let hexArray
let dehexArray

function toHexPart(arr, start, end) {
  let o = ''
  let i = start
  const last3 = end - 3
  // Unrolled loop is faster
  while (i < last3) {
    const a = arr[i++]
    const b = arr[i++]
    const c = arr[i++]
    const d = arr[i++]
    o += hexArray[a]
    o += hexArray[b]
    o += hexArray[c]
    o += hexArray[d]
  }

  while (i < end) o += hexArray[arr[i++]]
  return o
}

export function toHex(arr) {
  assertTypedArray(arr)
  if (!(arr instanceof Uint8Array)) arr = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
  if (arr.length === 0) return ''
  if (webHex && arr.toHex === webHex) return arr.toHex()
  if (haveNativeBuffer) {
    if (arr.constructor === Buffer && Buffer.isBuffer(arr)) return arr.toString('hex')
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('hex')
  }

  if (!hexArray) hexArray = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
  const length = arr.length // this helps Hermes

  if (length > 30_000) {
    // Limit concatenation to avoid excessive GC
    // Thresholds checked on Hermes
    const concat = []
    for (let i = 0; i < length; ) {
      const step = i + 500
      const end = step > length ? length : step
      concat.push(toHexPart(arr, i, end))
      i = end
    }

    const res = concat.join('')
    concat.length = 0
    return res
  }

  return toHexPart(arr, 0, length)
}

// Unlike Buffer.from(), throws on invalid input
let fromHex
if (Uint8Array.fromHex) {
  fromHex = (str, format = 'uint8') => typedView(Uint8Array.fromHex(str), format)
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
    const length = arr.length // this helps Hermes
    if (nativeEncoder) {
      const codes = nativeEncoder.encode(str)
      for (let i = 0; i < length; i++) {
        const a = dehexArray[codes[j++]] * 16 + dehexArray[codes[j++]]
        if (!a && a !== 0) throw new Error('Input is not a hex string')
        arr[i] = a
      }
    } else {
      for (let i = 0; i < length; i++) {
        const a = dehexArray[str.charCodeAt(j++)] * 16 + dehexArray[str.charCodeAt(j++)]
        if (!a && a !== 0) throw new Error('Input is not a hex string')
        arr[i] = a
      }
    }

    return typedView(arr, format)
  }
}

export { fromHex }
