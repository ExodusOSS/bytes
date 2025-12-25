import { assertUint8 } from './assert.js'
import { canDecoders } from './fallback/_utils.js'
import { assertEncoding, encodingDecoder } from './fallback/single-byte.js'

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

export const windows1252toString = createSinglebyteDecoder('windows-1252')
