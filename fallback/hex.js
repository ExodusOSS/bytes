import { assertUint8 } from '../assert.js'
import { nativeEncoder } from './_utils.js'

let hexArray
let dehexArray
const _00 = 0x30_30 // '00' string in hex, the only allowed char pair to generate 0 byte
const _ff = 0x66_66 // 'ff' string in hex, max allowed char pair (larger than 'FF' string)
const allowed = '0123456789ABCDEFabcdef'
const useEncodeInto = Boolean(nativeEncoder?.encodeInto && globalThis.HermesInternal) // faster on Hermes, much slower on Webkit

export const E_HEX = 'Input is not a hex string'

function toHexPartAddition(arr, start, end) {
  let o = ''
  let i = start
  const last3 = end - 3
  // Unrolled loop is faster
  while (i < last3) {
    const a = arr[i++]
    const b = arr[i++]
    const c = arr[i++]
    const d = arr[i++]
    o += hexArray[a]
    o += hexArray[b]
    o += hexArray[c]
    o += hexArray[d]
  }

  while (i < end) o += hexArray[arr[i++]]
  return o
}

// Optimiziation for Hermes which is the main user of fallback
function toHexPartTemplates(arr, start, end) {
  let o = ''
  let i = start
  const last7 = end - 7
  const ha = hexArray
  // Unrolled loop is faster
  while (i < last7) {
    const a = arr[i++]
    const b = arr[i++]
    const c = arr[i++]
    const d = arr[i++]
    const e = arr[i++]
    const f = arr[i++]
    const g = arr[i++]
    const h = arr[i++]
    o += `${ha[a]}${ha[b]}${ha[c]}${ha[d]}${ha[e]}${ha[f]}${ha[g]}${ha[h]}`
  }

  while (i < end) o += hexArray[arr[i++]]
  return o
}

// Using templates is significantly faster in Hermes and JSC
// It's harder to detect JSC and not important anyway as it has native impl, so we detect only Hermes
const toHexPart = globalThis.HermesInternal ? toHexPartTemplates : toHexPartAddition

export function toHex(arr) {
  assertUint8(arr)

  if (!hexArray) hexArray = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
  const length = arr.length // this helps Hermes

  if (length > 30_000) {
    // Limit concatenation to avoid excessive GC
    // Thresholds checked on Hermes
    const concat = []
    for (let i = 0; i < length; ) {
      const step = i + 500
      const end = step > length ? length : step
      concat.push(toHexPart(arr, i, end))
      i = end
    }

    const res = concat.join('')
    concat.length = 0
    return res
  }

  return toHexPart(arr, 0, length)
}

export function fromHex(str) {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  if (str.length % 2 !== 0) throw new SyntaxError(E_HEX)

  const length = str.length / 2 // this helps Hermes in loops
  const arr = new Uint8Array(length)
  let j = 0

  // Native encoder path is beneficial even for small arrays in Hermes
  if (nativeEncoder) {
    if (!dehexArray) {
      dehexArray = new Uint8Array(_ff + 1)
      const u8 = new Uint8Array(2)
      const u16 = new Uint16Array(u8.buffer, u8.byteOffset, 1) // for endianess-agnostic transform
      const map = [...allowed].map((c) => [c.charCodeAt(0), parseInt(c, 16)])
      for (const [ch, vh] of map) {
        u8[0] = ch // first we read high hex char
        for (const [cl, vl] of map) {
          u8[1] = cl // then we read low hex char
          dehexArray[u16[0]] = (vh << 4) | vl
        }
      }
    }

    let codes
    if (useEncodeInto) {
      // Much faster in Hermes
      codes = new Uint8Array(str.length + 4) // overshoot by a full utf8 char
      const info = nativeEncoder.encodeInto(str, codes)
      if (info.read !== str.length || info.written !== str.length) throw new SyntaxError(E_HEX) // non-ascii
      codes = codes.subarray(0, str.length)
    } else {
      codes = nativeEncoder.encode(str)
      if (codes.length !== str.length) throw new SyntaxError(E_HEX) // non-ascii
    }

    const codes16 = new Uint16Array(codes.buffer, codes.byteOffset, codes.byteLength / 2)
    let i = 0
    for (const last3 = length - 3; i < last3; ) {
      const ai = codes16[j++]
      const bi = codes16[j++]
      const ci = codes16[j++]
      const di = codes16[j++]
      const a = dehexArray[ai]
      const b = dehexArray[bi]
      const c = dehexArray[ci]
      const d = dehexArray[di]
      if ((!a && ai !== _00) || (!b && bi !== _00) || (!c && ci !== _00) || (!d && di !== _00)) {
        throw new SyntaxError(E_HEX)
      }

      arr[i++] = a
      arr[i++] = b
      arr[i++] = c
      arr[i++] = d
    }

    while (i < length) {
      const ai = codes16[j++]
      const a = dehexArray[ai]
      if (!a && ai !== _00) throw new SyntaxError(E_HEX)
      arr[i++] = a
    }
  } else {
    if (!dehexArray) {
      // no regex input validation here, so we map all other bytes to -1 and recheck sign
      // non-ASCII chars throw already though, so we should process only 0-127
      dehexArray = new Int8Array(128).fill(-1)
      for (let i = 0; i < 16; i++) {
        const s = i.toString(16)
        dehexArray[s.charCodeAt(0)] = dehexArray[s.toUpperCase().charCodeAt(0)] = i
      }
    }

    for (let i = 0; i < length; i++) {
      const a = str.charCodeAt(j++)
      const b = str.charCodeAt(j++)
      const res = (dehexArray[a] << 4) | dehexArray[b]
      if (res < 0 || (0x7f | a | b) !== 0x7f) throw new SyntaxError(E_HEX) // 0-127
      arr[i] = res
    }
  }

  return arr
}
