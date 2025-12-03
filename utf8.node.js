import { assertUint8 } from './assert.js'
import { typedView } from './array.js'
import { E_STRICT_UNICODE } from './fallback/utf8.js'
import { isAscii } from 'node:buffer'

if (Buffer.TYPED_ARRAY_SUPPORT) throw new Error('Unexpected Buffer polyfill')

const decoderFatal = new TextDecoder('utf8', { ignoreBOM: true, fatal: true })
const decoderLoose = new TextDecoder('utf8', { ignoreBOM: true })
const { isWellFormed } = String.prototype

function encode(str, loose = false) {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  const res = Buffer.from(str)
  if (loose || str.length === res.length || isWellFormed.call(str)) return res // length is equal only for ascii, which is automatically fine
  throw new TypeError(E_STRICT_UNICODE)
}

function decode(arr, loose = false) {
  assertUint8(arr)
  if (isAscii(arr)) {
    // On non-ascii strings, this loses ~10% * [relative position of the first non-ascii byte] (up to 10% total)
    // On ascii strings, this wins 1.5x on loose = false and 1.3x on loose = true
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).latin1Slice(0, arr.byteLength) // .latin1Slice is faster than .asciiSlice
  }

  return loose ? decoderLoose.decode(arr) : decoderFatal.decode(arr)
}

export const utf8fromString = (str, format = 'uint8') => typedView(encode(str, false), format)
export const utf8fromStringLoose = (str, format = 'uint8') => typedView(encode(str, true), format)
export const utf8toString = (arr) => decode(arr, false)
export const utf8toStringLoose = (arr) => decode(arr, true)
