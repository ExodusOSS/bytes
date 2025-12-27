import { assertUint8 } from './assert.js'
import { canDecoders, nativeEncoder } from './fallback/_utils.js'
import { encodeAscii } from './fallback/latin1.js'
import { assertEncoding, encodingDecoder, encodeMap, E_STRICT } from './fallback/single-byte.js'

const { TextDecoder } = globalThis

let windows1252works

// prettier-ignore
const skipNative = new Set([
  'iso-8859-16', // iso-8859-16 is somehow broken in WebKit, at least on CI
  'iso-8859-6', 'iso-8859-8', 'iso-8859-8-i', // slow in all 3 engines
])

function shouldUseNative(enc) {
  // https://issues.chromium.org/issues/468458388
  // Also might be incorrectly imlemented on platforms as Latin1 (e.g. in Node.js) or regress
  // This is the most significant single-byte encoding, 'ascii' and 'latin1' alias to this
  // Even after Chrome bug is fixed, this should serve as a quick correctness check that it's actually windows-1252
  if (enc === 'windows-1252') {
    if (windows1252works === undefined) {
      windows1252works = false
      try {
        const u = new Uint8Array(9) // using 9 bytes is significant to catch the bug
        u[8] = 128
        windows1252works = new TextDecoder(enc).decode(u).codePointAt(8) === 0x20_ac
      } catch {}
    }

    return windows1252works
  }

  return !skipNative.has(enc)
}

export function createSinglebyteDecoder(encoding, loose = false) {
  if (typeof loose !== 'boolean') throw new TypeError('loose option should be boolean')
  assertEncoding(encoding)

  if (canDecoders && shouldUseNative(encoding)) {
    // In try, as not all encodings might be implemented in all engines which have native TextDecoder
    try {
      const decoder = new TextDecoder(encoding, { fatal: !loose })
      return (arr) => {
        assertUint8(arr)
        if (arr.byteLength === 0) return ''
        return decoder.decode(arr)
      }
    } catch {}
  }

  const jsDecoder = encodingDecoder(encoding)
  return (arr) => {
    assertUint8(arr)
    if (arr.byteLength === 0) return ''
    return jsDecoder(arr, loose)
  }
}

const NON_LATIN = /[^\x00-\xFF]/ // eslint-disable-line no-control-regex

function encode(s, m) {
  const len = s.length
  const x = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    const x0 = s.charCodeAt(i)
    const c0 = m[x0]
    if (!c0 && x0) return null
    x[i] = c0
  }

  return x
}

export function createSinglebyteEncoder(encoding, { mode = 'fatal' } = {}) {
  // TODO: replacement, truncate (replacement will need varying length)
  if (mode !== 'fatal') throw new Error('Unsupported mode')
  const m = encodeMap(encoding) // asserts

  // No single-byte encoder produces surrogate pairs, so any surrogate is invalid
  // This needs special treatment only to decide how many replacement chars to output, one or two
  // Not much use in running isWellFormed, most likely cause of error is unmapped chars, not surrogate pairs
  return (s) => {
    if (typeof s !== 'string') throw new TypeError('Input is not a string')

    // Instead of an ASCII regex check, encode optimistically - this is faster
    // Check for 8-bit string with a regex though, this is instant on 8-bit strings so doesn't hurt the ASCII fast path
    if (nativeEncoder && !NON_LATIN.test(s)) {
      try {
        return encodeAscii(s, E_STRICT)
      } catch {}
    }

    const res = encode(s, m)
    if (!res) throw new TypeError(E_STRICT)
    return res
  }
}

export const windows1252toString = createSinglebyteDecoder('windows-1252')
export const windows1252fromString = createSinglebyteEncoder('windows-1252')
