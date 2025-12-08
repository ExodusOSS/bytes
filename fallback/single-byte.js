import { asciiPrefix, decodeLatin1 } from './latin1.js'
import encodings from './single-byte.encodings.js'
import { decode2string } from './_utils.js'

export const E_STRICT = 'Input is not well-formed for this encoding'

export const assertEncoding = (encoding) => {
  if (!Object.hasOwn(encodings, encoding)) throw new RangeError('Unsupported encoding')
}

function getEncoding(encoding) {
  assertEncoding(encoding)
  return encodings[encoding]
}

const mappers = new Map()
const decoders = new Map()

// Used only on Node.js, no reason to optimize for anything else
// E.g. avoiding .from and filling zero-initialized arr manually is faster on Hermes, but we avoid this codepath on Hermes completely
export function encodingMapper(encoding) {
  const cached = mappers.get(encoding)
  if (cached) return cached

  const incomplete = getEncoding(encoding).includes('\uFFFD')
  let map
  const mapper = (arr, start = 0) => {
    if (!map) {
      map = Uint16Array.from({ length: 256 }, (_, i) => i) // Unicode subset
      const strings = getEncoding(encoding).split('')
      map.set(Uint16Array.from(strings.map((x) => x.charCodeAt(0))), 128)
    }

    const o = Uint16Array.from(start === 0 ? arr : arr.subarray(start)) // copy to modify in-place, also those are 16-bit now
    let i = 0
    for (const end3 = o.length - 3; i < end3; i += 4) {
      o[i] = map[o[i]]
      o[i + 1] = map[o[i + 1]]
      o[i + 2] = map[o[i + 2]]
      o[i + 3] = map[o[i + 3]]
    }

    for (const end = o.length; i < end; i++) o[i] = map[o[i]] // 3 high bytes must match for 0x80-0x9f range
    return o
  }

  mappers.set(encoding, { mapper, incomplete })
  return { mapper, incomplete }
}

export function encodingDecoder(encoding) {
  const cached = decoders.get(encoding)
  if (cached) return cached

  let strings
  const incomplete = getEncoding(encoding).includes('\uFFFD')
  const decoder = (arr, loose = false) => {
    if (!strings) {
      const part = getEncoding(encoding).split('')
      strings = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).concat(part)
      while (strings.length < 256) strings.push(String.fromCharCode(strings.length))
    }

    const prefix = decodeLatin1(arr, 0, asciiPrefix(arr))
    if (prefix.length === arr.length) return prefix
    const suffix = decode2string(arr, prefix.length, arr.length, strings)
    if (!loose && incomplete && suffix.includes('\uFFFD')) throw new SyntaxError(E_STRICT)
    return prefix + suffix
  }

  decoders.set(encoding, decoder)
  return decoder
}
