import { assertUint8 } from './assert.js'
import { nativeDecoder } from './fallback/_utils.js'
import { assertEncoding, encodingDecoder } from './fallback/single-byte.js'

export function createDecoder(encoding) {
  assertEncoding(encoding)

  if (nativeDecoder) {
    const decoder = new globalThis.TextDecoder(encoding)
    return (arr) => {
      assertUint8(arr)
      if (arr.byteLength === 0) return ''
      return decoder.decode(arr) // Node.js and browsers
    }
  }

  const jsDecoder = encodingDecoder(encoding)
  return (arr) => {
    assertUint8(arr)
    if (arr.byteLength === 0) return ''
    return jsDecoder(arr)
  }
}

export const windows1252toString = createDecoder('windows-1252')
