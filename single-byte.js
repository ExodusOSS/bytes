import { assertUint8 } from './assert.js'
import { canDecoders } from './fallback/_utils.js'
import { assertEncoding, encodingDecoder } from './fallback/single-byte.js'

const { TextDecoder } = globalThis

let windows1252works, iso885916works

function shouldUseNative(enc) {
  // https://issues.chromium.org/issues/468458388
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

  // iso-8859-16 is somehow broken in WebKit, at least on CI
  if (enc === 'iso-8859-16') {
    if (iso885916works === undefined) {
      iso885916works = false
      try {
        new TextDecoder(enc).decode(Uint8Array.of(255))
        iso885916works = true
      } catch {}
    }

    return iso885916works
  }

  return true
}

export function createDecoder(encoding, loose = false) {
  if (encoding === 'iso-8859-8-i') encoding = 'iso-8859-8'
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

export const windows1252toString = createDecoder('windows-1252')
