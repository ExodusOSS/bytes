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
const decoderFatal16 = isLE ? decoderFatalLE : decoderFatalBE
const decoderLoose16 = isLE ? decoderLooseLE : decoderFatalBE
const { isWellFormed } = String.prototype

const { E_STRICT, E_STRICT_UNICODE } = js

// Unlike utf8, operates on Uint16Arrays by default

const to8 = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
const to16 = (a) => new Uint16Array(a.buffer, a.byteOffset, a.byteLength / 2) // Requires checked length and alignment!
const to16input = (x) => to16(x.byteOffset % 2 === 0 ? x : Uint8Array.from(x)) // Requires checked length

function swapEndianness(u8, inPlace = false) {
  // Assume even number of bytes
  const res = inPlace ? u8 : new Uint8Array(u8.length)

  let i = 0
  for (const last3 = u8.length - 3; i < last3; i += 4) {
    const x0 = u8[i]
    const x1 = u8[i + 1]
    const x2 = u8[i + 2]
    const x3 = u8[i + 3]
    res[i] = x1
    res[i + 1] = x0
    res[i + 2] = x3
    res[i + 3] = x2
  }

  for (const last = u8.length - 1; i < last; i += 2) {
    const x0 = u8[i]
    const x1 = u8[i + 1]
    res[i] = x1
    res[i + 1] = x0
  }

  return res
}

function assertNotLoose(str, u16, ERR) {
  if (isWellFormed) {
    if (!isWellFormed.call(str)) throw new SyntaxError(ERR)
  } else {
    throw new Error('Unsupported') // TODO
  }
}

function encode(str, loose = false, format = 'uint16') {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  if (format !== 'uint16' && format !== 'uint8-le' && format !== 'uint8-be') {
    throw new TypeError('Unknown format')
  }

  const u16 = js.encode(str)
  if (!loose) assertNotLoose(str, u16, E_STRICT_UNICODE)

  if (format === 'uint8-le') return isLE ? to8(u16) : swapEndianness(to8(u16), true)
  if (format === 'uint8-be') return isLE ? swapEndianness(to8(u16), true) : to8(u16)
  if (format === 'uint16') return u16
  throw new Error('Unreachable')
}

function decode(input, loose = false, format = 'uint16') {
  let u16
  switch (format) {
    case 'uint16':
      if (!(input instanceof Uint16Array)) throw new TypeError('Expected an Uint16Array')
      if (haveDecoder) return loose ? decoderLoose16.decode(input) : decoderFatal16.decode(input)
      u16 = input
      break
    case 'uint8-le':
      if (!(input instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
      if (input.byteLength % 2 !== 0) throw new TypeError('Expected even number of bytes')
      if (haveDecoder) return loose ? decoderLooseLE.decode(input) : decoderFatalLE.decode(input)
      u16 = isLE ? to16input(input) : to16(swapEndianness(input, false))
      break
    case 'uint8-be':
      if (!(input instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
      if (input.byteLength % 2 !== 0) throw new TypeError('Expected even number of bytes')
      if (haveDecoder) return loose ? decoderLooseBE.decode(input) : decoderFatalBE.decode(input)
      u16 = isLE ? to16(swapEndianness(input, false)) : to16input(input)
      break
    default:
      throw new TypeError('Unknown format')
  }

  const str = js.decode(u16)
  if (!loose) assertNotLoose(str, u16, E_STRICT)

  return str
}

export const utf16fromString = (str, format = 'uint16') => encode(str, false, format)
export const utf16fromStringLoose = (str, format = 'uint16') => encode(str, true, format)
export const utf16toString = (arr, format = 'uint16') => decode(arr, false, format)
export const utf16toStringLoose = (arr, format = 'uint16') => decode(arr, true, format)
