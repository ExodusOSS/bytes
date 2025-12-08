import { asciiPrefix, decodeLatin1 } from './latin1.js'
import { decode2string } from './_utils.js'

const encodings = {
  'windows-1252': '€\x81‚ƒ„…†‡ˆ‰Š‹Œ\x8DŽ\x8F\x90‘’“”•–—˜™š›œ\x9DžŸ',
}

export const assertEncoding = (encoding) => {
  if (!Object.hasOwn(encodings, encoding)) throw new RangeError('Invalid encoding')
}

function getEncoding(encoding) {
  assertEncoding(encoding)
  return encodings[encoding].split('')
}

const mappers = new Map()
const decoders = new Map()

// Used only on Node.js, no reason to optimize for anything else
// E.g. avoiding .from and filling zero-initialized arr manually is faster on Hermes, but we avoid this codepath on Hermes completely
export function encodingMapper(encoding) {
  const cached = mappers.get(encoding)
  if (cached) return cached

  let map
  const mapper = (arr, start = 0) => {
    if (!map) {
      map = Uint16Array.from({ length: 256 }, (_, i) => i) // Unicode subset
      map.set(Uint16Array.from(getEncoding(encoding).map((x) => x.charCodeAt(0))), 128)
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

  mappers.set(encoding, mapper)
  return mapper
}

export function encodingDecoder(encoding) {
  const cached = decoders.get(encoding)
  if (cached) return cached

  let strings
  const decoder = (arr) => {
    if (!strings) {
      const part = getEncoding(encoding)
      strings = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).concat(part)
      while (strings.length < 256) strings.push(String.fromCharCode(strings.length))
    }

    const prefix = decodeLatin1(arr, 0, asciiPrefix(arr))
    if (prefix.length === arr.length) return prefix
    return prefix + decode2string(arr, prefix.length, arr.length, strings)
  }

  decoders.set(encoding, decoder)
  return decoder
}
