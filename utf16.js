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
    if (!isLE) js.swapEndiannessInPlace(u8) // TODO: avoid doing this twice
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
    if (isLE !== needLE) js.swapEndiannessInPlace(u8) // TODO: avoid doing this twice
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
    if (isLE !== gotLE) arr = js.swapEndianness(arr) // TODO: avoid doing this on native decoder
    arr = new Uint16Array(arr.buffer, arr.byteOffset, arr.byteLength / 2)
  }

  if (!(arr instanceof Uint16Array)) throw new TypeError('Expected an Uint16Array')
  if (haveDecoder && !haveNativeBuffer) {
    // We skip this on Node.js, as utf16 TextDecoder is somewhy significantly slower than Buffer there
    return loose ? decoderLoose.decode(arr) : decoderFatal.decode(arr) // browsers
  }

  let str
  if (haveNativeBuffer) {
    let u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
    if (!isLE) u8 = js.swapEndianness(u8) // TODO: avoid doing this more than once
    str = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('utf-16le')
  } else {
    str = js.decode(arr)
  }

  if (!loose) {
    if (isWellFormed) {
      if (!isWellFormed.call(str)) throw new SyntaxError(E_STRICT)
    } else if (str.includes('\uFFFD')) {
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
