import { assertUint8 } from './assert.js'
import { nativeDecoder } from './fallback/_utils.js'
import { assertEncoding, encodingDecoder } from './fallback/single-byte.js'

const { TextDecoder } = globalThis

export function createDecoder(encoding) {
  assertEncoding(encoding)

  // iso-8859-16 is somehow broken in WebKit, at least on CI
  if (nativeDecoder && encoding !== 'iso-8859-16') {
    const decoder = new TextDecoder(encoding)
    const decoderFatal = new TextDecoder(encoding, { fatal: true })
    return (arr, loose = false) => {
      assertUint8(arr)
      if (arr.byteLength === 0) return ''
      return (loose ? decoder : decoderFatal).decode(arr)
    }
  }

  const jsDecoder = encodingDecoder(encoding)
  return (arr, loose) => {
    assertUint8(arr)
    if (arr.byteLength === 0) return ''
    return jsDecoder(arr, loose)
  }
}

export const windows1252toString = createDecoder('windows-1252')
