import { decodeLatin1, encodeCharcodes } from './latin1.js'

export const E_STRICT = 'Input is not well-formed utf16'
export const E_STRICT_UNICODE = 'Input is not well-formed Unicode'

// it's capable of decoding Uint16Array to UTF-16 as well
export const decode = (arr) => decodeLatin1(arr, 0, arr.length)

// Same as encodeLatin1, but with Uint16Array
export const encode = (str) => encodeCharcodes(str, new Uint16Array(str.length))
