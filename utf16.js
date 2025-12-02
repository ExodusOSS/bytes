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

// Unlike utf8, operates on Uint16Arrays

function encode(str, loose = false, format = 'uint16') {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  if (format !== 'uint16') throw new TypeError('utf16fromString can only return Uint16Array')

  let arr
  if (haveNativeBuffer && isLE) {
    const u8 = Buffer.from(str, enc)
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

  return arr
}

function decode(arr, loose = false) {
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

export const utf16fromString = (str, format = 'uint16') => encode(str, false, format)
export const utf16fromStringLoose = (str, format = 'uint16') => encode(str, true, format)
export const utf16toString = (arr) => decode(arr, false)
export const utf16toStringLoose = (arr) => decode(arr, true)
