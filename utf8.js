import { assert, assertUint8 } from './assert.js'
import { typedView } from './array.js'
import * as js from './fallback/utf8.js'

const { Buffer, TextEncoder, TextDecoder } = globalThis // Buffer is optional
const { decodeURIComponent, encodeURIComponent, escape, unescape } = globalThis
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const haveNativeDecoder = isNative(TextDecoder)
const nativeEncoder = isNative(TextEncoder) ? new TextEncoder() : null
const decoderFatal = haveNativeDecoder ? new TextDecoder('utf8', { fatal: true }) : null
const decoderLoose = haveNativeDecoder ? new TextDecoder('utf8') : null

const { E_STRICT, E_STRICT_UNICODE } = js

const shouldUseEscapePath = Boolean(globalThis.HermesInternal) // faster only on Hermes, js path beats it on normal engines
const shouldUseUnescapePath = Boolean(globalThis.HermesInternal) // ditto, except that we don't really need it with TextEncoder

function deLoose(str, loose, res) {
  if (loose) return res
  // Recheck if the string was encoded correctly
  let start = 0
  const last = res.length - 2
  // Search for EFBFBD
  while (start < last) {
    const pos = res.indexOf(0xef, start)
    if (pos === -1) break
    start = pos + 1
    if (res[pos + 1] === 0xbf && res[pos + 2] === 0xbd) {
      // Found a replacement char in output, need to recheck if we encoded the input correctly
      assert(str === decode(res), E_STRICT_UNICODE)
      return res
    }
  }

  return res
}

function encode(str, loose = false) {
  assert(typeof str === 'string')
  // Node.js, browsers, and Hermes have native TextEncoder
  if (haveNativeBuffer) return deLoose(str, loose, Buffer.from(str)) // faster on ascii on Node.js
  if (nativeEncoder) return deLoose(str, loose, nativeEncoder.encode(str))
  if (shouldUseUnescapePath && unescape && encodeURIComponent) {
    // This path is not really critical, it's enabled only for Hermes, but modern Hermes already has TextEncoder
    // TODO: do we need this at all? Remove in a separate commit for history
    try {
      const bin = unescape(encodeURIComponent(str)) // utf8 to asci
      const length = bin.length
      const arr = new Uint8Array(length)
      for (let i = 0; i < length; i++) arr[i] = bin.charCodeAt(i)
      return arr
    } catch {
      if (!loose) throw new Error(E_STRICT_UNICODE)
      // Ok, we have to use manual implementation for loose encoder
    }
  }

  return js.encode(str, loose)
}

let escapes

function toEscapesPart(arr, start, end) {
  let o = ''
  let i = start
  const last3 = end - 3
  // Unrolled loop is faster
  while (i < last3) {
    const a = arr[i++]
    const b = arr[i++]
    const c = arr[i++]
    const d = arr[i++]
    o += escapes[a]
    o += escapes[b]
    o += escapes[c]
    o += escapes[d]
  }

  while (i < end) o += escapes[arr[i++]]
  return o
}

function decode(arr, loose = false) {
  assertUint8(arr)
  // Node.js and browsers have native TextDecoder, in Node.js it's not slower than Buffer and is cleaner
  if (haveNativeDecoder) return loose ? decoderLoose.decode(arr) : decoderFatal.decode(arr)
  if (haveNativeBuffer) {
    // should be urechable unless TextEncoder is unset
    const res = typedView(arr, 'buffer').toString()
    // If we have a replacement symbol, recheck if output matches input
    if (!loose && res.includes('\uFFFD')) {
      assert(Buffer.compare(arr, utf8fromString(res)) === 0, E_STRICT)
    }

    return res
  }

  if (shouldUseEscapePath && escape && decodeURIComponent) {
    if (!escapes) escapes = Array.from({ length: 256 }, (_, i) => escape(String.fromCharCode(i)))
    const length = arr.length
    let o
    if (length > 30_000) {
      // Limit concatenation to avoid excessive GC
      // TODO: recheck thresholds on Hermes (taken from hex)
      const concat = []
      for (let i = 0; i < length; ) {
        const step = i + 500
        const end = step > length ? length : step
        concat.push(toEscapesPart(arr, i, end))
        i = end
      }

      o = concat.join('')
      concat.length = 0
    } else {
      o = toEscapesPart(arr, 0, length)
    }

    try {
      return decodeURIComponent(o) // asci to utf8, escape() is precalucated
    } catch {
      if (!loose) throw new Error(E_STRICT)
      // Ok, we have to use manual implementation for loose decoder
    }
  }

  return js.decode(arr, loose)
}

export const utf8fromString = (str, format = 'uint8') => typedView(encode(str, false), format)
export const utf8fromStringLoose = (str, format = 'uint8') => typedView(encode(str, true), format)
export const utf8toString = (arr) => decode(arr, false)
export const utf8toStringLoose = (arr) => decode(arr, true)
