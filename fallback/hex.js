import { assertUint8 } from '../assert.js'
import { nativeEncoder } from './_utils.js'

let hexArray
let dehexArray

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

  if (!dehexArray) {
    // no regex input validation here, so we map all other bytes to -1 and recheck sign
    // non-ASCII chars throw already though, so we should process only 0-127
    dehexArray = new Int8Array(128).fill(-1)
    for (let i = 0; i < 16; i++) {
      const s = i.toString(16)
      dehexArray[s.charCodeAt(0)] = dehexArray[s.toUpperCase().charCodeAt(0)] = i
    }
  }

  const length = str.length / 2 // this helps Hermes in loops
  const arr = new Uint8Array(length)
  let j = 0
  if (nativeEncoder) {
    // Native encoder path is beneficial even for small arrays in Hermes
    const codes = nativeEncoder.encode(str)
    if (codes.length !== str.length) throw new SyntaxError(E_HEX) // non-ascii
    const last3 = length - 3 // Unroll nativeEncoder path as this is what modern Hermes takes and a small perf improvement is nice there
    let i = 0
    while (i < last3) {
      const a = (dehexArray[codes[j++]] << 4) | dehexArray[codes[j++]]
      const b = (dehexArray[codes[j++]] << 4) | dehexArray[codes[j++]]
      const c = (dehexArray[codes[j++]] << 4) | dehexArray[codes[j++]]
      const d = (dehexArray[codes[j++]] << 4) | dehexArray[codes[j++]]
      if (a < 0 || b < 0 || c < 0 || d < 0) throw new SyntaxError(E_HEX)
      arr[i++] = a
      arr[i++] = b
      arr[i++] = c
      arr[i++] = d
    }

    while (i < length) {
      const res = (dehexArray[codes[j++]] << 4) | dehexArray[codes[j++]]
      if (res < 0) throw new SyntaxError(E_HEX)
      arr[i++] = res
    }
  } else {
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
