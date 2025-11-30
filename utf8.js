import { assertUint8 } from './assert.js'
import { typedView } from './array.js'
import * as js from './fallback/utf8.js'
import * as ascii from './fallback/ascii.js'

const { Buffer, TextEncoder, TextDecoder, decodeURIComponent, escape } = globalThis // Buffer is optional
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const haveDecoder = isNative(TextDecoder)
const nativeEncoder = isNative(TextEncoder) ? new TextEncoder() : null
// ignoreBOM: true means that BOM will be left as-is, i.e. will be present in the output
// We don't want to strip anything unexpectedly
const decoderFatal = haveDecoder ? new TextDecoder('utf8', { ignoreBOM: true, fatal: true }) : null
const decoderLoose = haveDecoder ? new TextDecoder('utf8', { ignoreBOM: true }) : null
const { isWellFormed } = String.prototype

const { E_STRICT, E_STRICT_UNICODE } = js

const shouldUseEscapePath = Boolean(globalThis.HermesInternal) // faster only on Hermes, js path beats it on normal engines

function deLoose(str, loose, res) {
  if (loose || str.length === res.length) return res // length is equal only for ascii, which is automatically fine
  if (isWellFormed) {
    // We have a fast native method
    if (isWellFormed.call(str)) return res
    throw new TypeError(E_STRICT_UNICODE)
  }

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
      if (str !== decode(res)) throw new TypeError(E_STRICT_UNICODE)
      return res
    }
  }

  return res
}

function encode(str, loose = false) {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  if (haveNativeBuffer) return deLoose(str, loose, Buffer.from(str)) // faster on ascii on Node.js
  if (nativeEncoder) return deLoose(str, loose, nativeEncoder.encode(str)) // Node.js, browsers, and Hermes
  // No reason to use unescape + encodeURIComponent: it's slower than JS on normal engines, and modern Hermes already has TextEncoder
  return js.encode(str, loose)
}

function decode(arr, loose = false) {
  assertUint8(arr)
  if (haveDecoder) return loose ? decoderLoose.decode(arr) : decoderFatal.decode(arr) // Node.js and browsers
  // No reason to use native Buffer: it's not faster than TextDecoder, needs rechecks in non-loose mode, and Node.js has TextDecoder

  // Fast path for ASCII prefix, this is faster than all alternatives below
  const prefix = ascii.decode(arr, 0, ascii.asciiPrefix(arr))
  if (prefix.length === arr.length) return prefix

  // This codepath gives a ~3x perf boost on Hermes
  if (shouldUseEscapePath && escape && decodeURIComponent) {
    const o = escape(ascii.decode(arr, prefix.length, arr.length))
    try {
      return prefix + decodeURIComponent(o) // Latin1 to utf8
    } catch {
      if (!loose) throw new TypeError(E_STRICT)
      // Ok, we have to use manual implementation for loose decoder
    }
  }

  return prefix + js.decode(arr, loose, prefix.length)
}

export const utf8fromString = (str, format = 'uint8') => typedView(encode(str, false), format)
export const utf8fromStringLoose = (str, format = 'uint8') => typedView(encode(str, true), format)
export const utf8toString = (arr) => decode(arr, false)
export const utf8toStringLoose = (arr) => decode(arr, true)
