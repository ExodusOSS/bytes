import { assertUint8 } from './assert.js'
import { typedView } from './array.js'
import { E_STRICT_UNICODE } from './fallback/utf8.js'
import { isAscii } from 'node:buffer'

if (Buffer.TYPED_ARRAY_SUPPORT) throw new Error('Unexpected Buffer polyfill')

const decoderFatal = new TextDecoder('utf8', { ignoreBOM: true, fatal: true })
const decoderLoose = new TextDecoder('utf8', { ignoreBOM: true })
const { isWellFormed } = String.prototype
const isDeno = Boolean(globalThis.Deno)

function encode(str, loose = false) {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  const strLength = str.length
  if (strLength === 0) return new Uint8Array() // faster than Uint8Array.of
  let res
  if (strLength > 0x4_00 && !isDeno) {
    // Faster for large strings
    const byteLength = Buffer.byteLength(str)
    res = Buffer.allocUnsafe(byteLength)
    const ascii = byteLength === strLength
    const written = ascii ? res.latin1Write(str) : res.utf8Write(str)
    if (written !== byteLength) throw new Error('Failed to write all bytes') // safeguard just in case
    if (ascii || loose) return res // no further checks needed
  } else {
    res = Buffer.from(str)
    if (res.length === strLength || loose) return res
  }

  if (!isWellFormed.call(str)) throw new TypeError(E_STRICT_UNICODE)
  return res
}

function decode(arr, loose = false) {
  assertUint8(arr)
  const byteLength = arr.byteLength
  if (byteLength === 0) return ''
  if (byteLength > 0x6_00 && !(isDeno && loose) && isAscii(arr)) {
    // On non-ascii strings, this loses ~10% * [relative position of the first non-ascii byte] (up to 10% total)
    // On ascii strings, this wins 1.5x on loose = false and 1.3x on loose = true
    // Only makes sense for large enough strings
    const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
    if (isDeno) return buf.toString() // Deno suffers from .latin1Slice
    return buf.latin1Slice(0, arr.byteLength) // .latin1Slice is faster than .asciiSlice
  }

  return loose ? decoderLoose.decode(arr) : decoderFatal.decode(arr)
}

export const utf8fromString = (str, format = 'uint8') => typedView(encode(str, false), format)
export const utf8fromStringLoose = (str, format = 'uint8') => typedView(encode(str, true), format)
export const utf8toString = (arr) => decode(arr, false)
export const utf8toStringLoose = (arr) => decode(arr, true)
