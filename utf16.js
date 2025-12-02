import * as js from './fallback/utf16.js'

const { Buffer, TextDecoder } = globalThis // Buffer is optional
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const haveDecoder = isNative(TextDecoder)
const isLE = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2
const enc = isLE ? 'utf-16le' : 'utf-16be'
const decoderFatal = haveDecoder ? new TextDecoder(enc, { ignoreBOM: true, fatal: true }) : null
const decoderLoose = haveDecoder ? new TextDecoder(enc, { ignoreBOM: true }) : null
const { isWellFormed } = String.prototype

const { E_STRICT, E_STRICT_UNICODE } = js

// Unlike utf8, operates on Uint16Arrays by default

function swapEndianness(u8) {
  // Assume even number of bytes
  const last = u8.length - 1
  for (let i = 0; i < last; i += 2) {
    const x0 = u8[i]
    u8[i] = u8[i + 1] // eslint-disable-line @exodus/mutable/no-param-reassign-prop-only
    u8[i + 1] = x0 // eslint-disable-line @exodus/mutable/no-param-reassign-prop-only
  }
}

function assertFormat(format) {
  if (format !== 'uint16' && format !== 'uint8-le' && format !== 'uint8-be') {
    throw new TypeError('Unknown format')
  }
}

function encode(str, loose = false, format = 'uint16') {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  assertFormat(format)

  let arr
  if (haveNativeBuffer) {
    const u8 = Buffer.from(str, 'utf-16le')
    if (!isLE) swapEndianness(u8) // TODO: avoid doing this twice
    arr = new Uint16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2)
  } else {
    arr = js.encode(str)
  }

  if (!loose) {
    if (isWellFormed) {
      if (!isWellFormed.call(str)) throw new SyntaxError(E_STRICT_UNICODE)
    } else if (arr.includes(0xff_fd)) {
      // TODO: optimize
      const str2 = decode(arr, true)
      if (str2 !== str) throw new SyntaxError(E_STRICT_UNICODE)
    }
  }

  if (format === 'uint8-le' || format === 'uint8-be') {
    const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    const needLE = format === 'uint8-le'
    if (isLE !== needLE) swapEndianness(u8) // TODO: avoid doing this twice
    return u8
  }

  return arr
}

function decode(arr, loose = false, format = 'uint16') {
  assertFormat(format)
  if (format === 'uint8-le' || format === 'uint8-be') {
    if (!(arr instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
    if (arr.byteLength % 2 !== 0) throw new TypeError('Expected even number of bytes')
    const gotLE = format === 'uint8-le'
    if (isLE !== gotLE) {
      arr = Uint8Array.from(arr) // TODO: avoid mutating input in a more effective way
      swapEndianness(arr) // TODO: avoid doing this on native decoder
    }

    arr = new Uint16Array(arr.buffer, arr.byteOffset, arr.byteLength / 2)
  }

  if (!(arr instanceof Uint16Array)) throw new TypeError('Expected an Uint16Array')
  if (haveDecoder) return loose ? decoderLoose.decode(arr) : decoderFatal.decode(arr) // Node.js and browsers
  // No reason to use native Buffer: it's not faster than TextDecoder, needs rechecks in non-loose mode, and Node.js has TextDecoder
  const str = js.decode(arr)

  if (!loose) {
    if (isWellFormed) {
      if (!isWellFormed.call(str)) throw new SyntaxError(E_STRICT)
    } else if (arr.includes(0xff_fd)) {
      // TODO: optimize
      const arr2 = encode(str, true)
      if (arr2.some((x, i) => x !== arr[i])) throw new SyntaxError(E_STRICT)
    }
  }

  return str
}

// TODO: support uint8-be and uint8-le
export const utf16fromString = (str, format = 'uint16') => encode(str, false, format)
export const utf16fromStringLoose = (str, format = 'uint16') => encode(str, true, format)
export const utf16toString = (arr, format = 'uint16') => decode(arr, false, format)
export const utf16toStringLoose = (arr, format = 'uint16') => decode(arr, true, format)
