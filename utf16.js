import * as js from './fallback/utf16.js'

const { Buffer, TextDecoder } = globalThis // Buffer is optional
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const haveDecoder = isNative(TextDecoder)
const isLE = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2
const ignoreBOM = true
const decoderFatalLE = haveDecoder ? new TextDecoder('utf-16le', { ignoreBOM, fatal: true }) : null
const decoderLooseLE = haveDecoder ? new TextDecoder('utf-16le', { ignoreBOM }) : null
const decoderFatalBE = haveDecoder ? new TextDecoder('utf-16be', { ignoreBOM, fatal: true }) : null
const decoderLooseBE = haveDecoder ? new TextDecoder('utf-16be', { ignoreBOM }) : null
const { isWellFormed } = String.prototype

const { E_STRICT, E_STRICT_UNICODE } = js

// Unlike utf8, operates on Uint16Arrays by default

const to8 = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
const to16 = (a) => new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2) // Requires checked length and alignment!

function restoreU16(u8le, u8be, inPlace = false) {
  if (isLE && u8le) return to16(u8le.byteOffset % 2 === 0 ? u8le : Uint8Array.from(u8le))
  if (!isLE && u8be) return to16(u8be.byteOffset % 2 === 0 ? u8be : Uint8Array.from(u8be))
  const u8 = u8le || u8be
  return to16(js.swapEndianness(u8, inPlace && u8.byteOffset % 2 === 0))
}

function encode(str, loose = false, format = 'uint16') {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  if (format !== 'uint16' && format !== 'uint8-le' && format !== 'uint8-be') {
    throw new TypeError('Unknown format')
  }

  let u16, u8le, u8be
  if (haveNativeBuffer) {
    u8le = Buffer.from(str, 'utf-16le')
  } else {
    u16 = js.encode(str)
    if (isLE) u8le = to8(u16)
    if (!isLE) u8be = to8(u16)
  }

  if (!loose) {
    if (isWellFormed) {
      if (!isWellFormed.call(str)) throw new SyntaxError(E_STRICT_UNICODE)
    } else {
      if (!u16) {
        if (!u8be && !isLE) u8be = js.swapEndianness(u8le) // TODO: could be in place in some cases
        u16 = restoreU16(u8le, u8be)
      }

      if (u16.includes(0xff_fd)) {
        // TODO: optimize
        const str2 = decodeFrom(u16, u8le, u8be, true)
        if (str2 !== str) throw new SyntaxError(E_STRICT_UNICODE)
      }
    }
  }

  if (format === 'uint8-le') return u8le || js.swapEndianness(u8be, true)
  if (format === 'uint8-be') return u8be || js.swapEndianness(u8le, true)
  if (format === 'uint16') return u16 || restoreU16(u8le, u8be, true)
  throw new Error('Unreachable')
}

function decode(input, loose = false, format = 'uint16') {
  // First, validate input and check what formats we know
  let u16, u8le, u8be
  switch (format) {
    case 'uint16':
      if (!(input instanceof Uint16Array)) throw new TypeError('Expected an Uint16Array')
      u16 = input
      if (isLE) u8le = to8(u16)
      if (!isLE) u8be = to8(u16)
      break
    case 'uint8-le':
      if (!(input instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
      if (input.byteLength % 2 !== 0) throw new TypeError('Expected even number of bytes')
      u8le = input
      break
    case 'uint8-be':
      if (!(input instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
      if (input.byteLength % 2 !== 0) throw new TypeError('Expected even number of bytes')
      u8be = input
      break
    default:
      throw new TypeError('Unknown format')
  }

  return decodeFrom(u16, u8le, u8be, loose)
}

function compare(a, b) {
  if (a.BYTES_PER_ELEMENT !== b.BYTES_PER_ELEMENT) throw new Error('Unsupported') // FIXME when exporting
  return a.length === b.length && a.every((x, i) => x === b[i]) // TODO: optimize
}

function decodeFrom(u16, u8le, u8be, loose = false) {
  // We skip this on Node.js, as utf16 TextDecoder is somewhy significantly slower than Buffer there
  const ignoreDecoder = haveNativeBuffer && u8le
  if (haveDecoder && !ignoreDecoder) {
    if (u8le) return loose ? decoderLooseLE.decode(u8le) : decoderFatalLE.decode(u8le)
    if (u8be) return loose ? decoderLooseBE.decode(u8be) : decoderFatalBE.decode(u8be)
  }

  let str
  if (haveNativeBuffer) {
    if (!u8le) u8le = js.swapEndianness(u8be)
    str = Buffer.from(u8le.buffer, u8le.byteOffset, u8le.byteLength).toString('utf-16le')
  } else {
    if (!u16) u16 = restoreU16(u8le, u8be)
    str = js.decode(u16)
  }

  if (!loose) {
    if (isWellFormed) {
      if (!isWellFormed.call(str)) throw new SyntaxError(E_STRICT)
    } else if (str.includes('\uFFFD')) {
      // TODO: optimize
      if (haveNativeBuffer) {
        // Native is u8le, we already have it
        const r = encode(str, true, 'uint8-le')
        if (!compare(r, u8le)) throw new SyntaxError(E_STRICT)
      } else {
        // Native is u16, we already have it
        const r = encode(str, true, 'uint16')
        if (!compare(r, u16)) throw new SyntaxError(E_STRICT)
      }
    }
  }

  return str
}

// TODO: support uint8-be and uint8-le
export const utf16fromString = (str, format = 'uint16') => encode(str, false, format)
export const utf16fromStringLoose = (str, format = 'uint16') => encode(str, true, format)
export const utf16toString = (arr, format = 'uint16') => decode(arr, false, format)
export const utf16toStringLoose = (arr, format = 'uint16') => decode(arr, true, format)
