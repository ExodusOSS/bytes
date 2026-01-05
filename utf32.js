import { isHermes, isLE, E_STRING } from './fallback/_utils.js'
import * as js from './fallback/utf32.js'
import * as utf16 from '@exodus/bytes/utf16.js'

// Unlike utf8, operates on Uint32Arrays by default

function encode(str, loose = false, format = 'uint32') {
  if (typeof str !== 'string') throw new TypeError(E_STRING)
  if (format !== 'uint32' && format !== 'uint8-le' && format !== 'uint8-be') {
    throw new TypeError('Unknown format')
  }

  const u32 = js.utf16to32(loose ? utf16.utf16fromStringLoose(str) : utf16.utf16fromString(str))

  if (format === 'uint32') return u32
  if (format === 'uint8-le' || format === 'uint8-be') {
    const u8 = js.to8(u32)
    if (isLE !== (format === 'uint8-le')) js.swap32(u8)
    return u8
  }

  throw new Error('Unreachable')
}

function decode(input, loose = false, format = 'uint32') {
  let u32
  switch (format) {
    case 'uint32':
      if (!(input instanceof Uint32Array)) throw new TypeError('Expected an Uint32Array')
      u32 = input
      break
    case 'uint8-le':
      if (!(input instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
      if (input.byteLength % 4 !== 0) throw new TypeError('Expected even number of bytes')
      u32 = js.to32input(input, true)
      break
    case 'uint8-be':
      if (!(input instanceof Uint8Array)) throw new TypeError('Expected an Uint8Array')
      if (input.byteLength % 4 !== 0) throw new TypeError('Expected even number of bytes')
      u32 = js.to32input(input, false)
      break
    default:
      throw new TypeError('Unknown format')
  }

  // TODO: recheck spidermonkey/Firefox/jsc perf

  if (!js.isStrict(u32)) {
    if (!loose) throw new RangeError(js.E_STRICT)
    u32 = js.toWellFormed(new Uint32Array(u32))
  }

  // Significantly faster on Hermes
  if (isHermes) return js.decode(u32, loose)

  // Significantly faster on Node.js, Chromium, v8, WebKit
  const u16 = js.utf32to16(u32)
  return loose ? utf16.utf16toStringLoose(u16) : utf16.utf16toString(u16)
}

export const utf32fromString = (str, format = 'uint32') => encode(str, false, format)
export const utf32fromStringLoose = (str, format = 'uint32') => encode(str, true, format)
export const utf32toString = (arr, format = 'uint32') => decode(arr, false, format)
export const utf32toStringLoose = (arr, format = 'uint32') => decode(arr, true, format)
