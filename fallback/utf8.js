export const E_STRICT = 'Input is not well-formed utf8'
export const E_STRICT_UNICODE = 'Input is not well-formed Unicode'

const replacementPoint = 0xff_fd

// https://encoding.spec.whatwg.org/#utf-8-decoder
// We are most likely in loose mode, for non-loose escape & decodeURIComponent solved everything
export function decode(arr, loose) {
  const start = 0
  const end = arr.length
  let out = ''
  const tmp = []

  for (let i = start; i < end; i++) {
    if (tmp.length > 0x2_00) {
      // far below MAX_ARGUMENTS_LENGTH in npmjs.com/buffer, we use smaller chunks
      // length can be off by a few as large code points produce two utf-16 char codes, also we overshoot in unrolled loop
      out += String.fromCharCode.apply(String, tmp)
      tmp.length = 0
    }

    const byte = arr[i]
    if (byte < 0x80) {
      // Fast path ascii
      tmp.push(byte)
      // Unroll the loop a bit for faster ops, overshoot by 20 chars
      for (let j = 0; j < 5; j++) {
        if (i + 1 >= end) break
        const byte1 = arr[i + 1]
        if (byte1 >= 0x80) break
        tmp.push(byte1)
        i++
        if (i + 1 >= end) break
        const byte2 = arr[i + 1]
        if (byte2 >= 0x80) break
        tmp.push(byte2)
        i++
        if (i + 1 >= end) break
        const byte3 = arr[i + 1]
        if (byte3 >= 0x80) break
        tmp.push(byte3)
        i++
        if (i + 1 >= end) break
        const byte4 = arr[i + 1]
        if (byte4 >= 0x80) break
        tmp.push(byte4)
        i++
      }
    } else if (byte < 0xc2) {
      if (!loose) throw new TypeError(E_STRICT)
      tmp.push(replacementPoint)
    } else if (byte < 0xe0) {
      // need 1 more
      if (i + 1 >= end) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        break
      }

      const byte1 = arr[i + 1]
      if (byte1 < 0x80 || byte1 > 0xbf) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        continue
      }

      i++
      tmp.push(((byte & 0x1f) << 6) | (byte1 & 0x3f))
    } else if (byte < 0xf0) {
      // need 2 more
      if (i + 1 >= end) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        break
      }

      const lower = byte === 0xe0 ? 0xa0 : 0x80
      const upper = byte === 0xed ? 0x9f : 0xbf
      const byte1 = arr[i + 1]
      if (byte1 < lower || byte1 > upper) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        continue
      }

      i++
      if (i + 1 >= end) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        break
      }

      const byte2 = arr[i + 1]
      if (byte2 < 0x80 || byte2 > 0xbf) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        continue
      }

      i++
      tmp.push(((byte & 0xf) << 12) | ((byte1 & 0x3f) << 6) | (byte2 & 0x3f))
    } else if (byte <= 0xf4) {
      // need 3 more
      if (i + 1 >= end) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        break
      }

      const lower = byte === 0xf0 ? 0x90 : 0x80
      const upper = byte === 0xf4 ? 0x8f : 0xbf
      const byte1 = arr[i + 1]
      if (byte1 < lower || byte1 > upper) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        continue
      }

      i++
      if (i + 1 >= end) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        break
      }

      const byte2 = arr[i + 1]
      if (byte2 < 0x80 || byte2 > 0xbf) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        continue
      }

      i++
      if (i + 1 >= end) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        break
      }

      const byte3 = arr[i + 1]
      if (byte3 < 0x80 || byte3 > 0xbf) {
        if (!loose) throw new TypeError(E_STRICT)
        tmp.push(replacementPoint)
        continue
      }

      i++
      const codePoint =
        ((byte & 0xf) << 18) | ((byte1 & 0x3f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
      if (codePoint > 0xff_ff) {
        // split into char codes as String.fromCharCode is faster than String.fromCodePoint
        const u = codePoint - 0x1_00_00
        tmp.push(0xd8_00 + ((u >> 10) & 0x3_ff), 0xdc_00 + (u & 0x3_ff))
      } else {
        tmp.push(codePoint)
      }
      // eslint-disable-next-line sonarjs/no-duplicated-branches
    } else {
      if (!loose) throw new TypeError(E_STRICT)
      tmp.push(replacementPoint)
    }
  }

  if (tmp.length > 0) out += String.fromCharCode.apply(String, tmp)
  return out
}

export function encode(string, loose) {
  const length = string.length
  let lead = null
  let small = true
  let bytes = new Uint8Array(length) // assume ascii
  let p = 0

  for (let i = 0; i < length; i++) {
    const code = string.charCodeAt(i)
    if (code < 0x80) {
      // Fast path for ascii
      if (lead) {
        if (!loose) throw new TypeError(E_STRICT_UNICODE)
        bytes[p++] = 0xef
        bytes[p++] = 0xbf
        bytes[p++] = 0xbd
        lead = null
      }

      bytes[p++] = code
      // Unroll the loop a bit for faster ops
      for (let j = 0; j < 5; j++) {
        if (i + 1 >= length) break
        const c1 = string.charCodeAt(i + 1)
        if (c1 >= 0x80) break
        bytes[p++] = c1
        i++
        if (i + 1 >= length) break
        const c2 = string.charCodeAt(i + 1)
        if (c2 >= 0x80) break
        bytes[p++] = c2
        i++
        if (i + 1 >= length) break
        const c3 = string.charCodeAt(i + 1)
        if (c3 >= 0x80) break
        bytes[p++] = c3
        i++
        if (i + 1 >= length) break
        const c4 = string.charCodeAt(i + 1)
        if (c4 >= 0x80) break
        bytes[p++] = c4
        i++
      }

      continue
    }

    if (small) {
      // TODO: use resizable array buffers? will have to return a non-resizeable one
      const bytesNew = new Uint8Array(length * 3) // maximium can be 3x of the string length in charcodes
      bytesNew.set(bytes)
      bytes = bytesNew
      small = false
    }

    // surrogate, charcodes = [d800 + a & 3ff, dc00 + b & 3ff]; codePoint = 0x1_00_00 | (a << 10) | b
    // lead: d800 - dbff
    // trail: dc00 - dfff
    if (code >= 0xd8_00 && code < 0xe0_00) {
      if (lead && code < 0xdc_00) {
        // a second lead, meaning the previous one was unpaired
        if (!loose) throw new TypeError(E_STRICT_UNICODE)
        bytes[p++] = 0xef
        bytes[p++] = 0xbf
        bytes[p++] = 0xbd
        lead = null
        // code is still processed as a new lead
      }

      if (!lead) {
        if (code > 0xdb_ff || i + 1 >= length) {
          // lead out of range || unpaired
          if (!loose) throw new TypeError(E_STRICT_UNICODE)
          bytes[p++] = 0xef
          bytes[p++] = 0xbf
          bytes[p++] = 0xbd
          continue
        }

        lead = code
        continue
      }

      // here, codePoint is always between 0x1_00_00 and 0x11_00_00, we encode as 4 bytes
      const codePoint = (((lead - 0xd8_00) << 10) | (code - 0xdc_00)) + 0x1_00_00
      bytes[p++] = (codePoint >> 18) | 0xf0
      bytes[p++] = ((codePoint >> 12) & 0x3f) | 0x80
      bytes[p++] = ((codePoint >> 6) & 0x3f) | 0x80
      bytes[p++] = (codePoint & 0x3f) | 0x80
      lead = null
      continue
    } else if (lead) {
      if (!loose) throw new TypeError(E_STRICT_UNICODE)
      bytes[p++] = 0xef
      bytes[p++] = 0xbf
      bytes[p++] = 0xbd
      lead = null
      // code is still processed
    }

    // We are left with a non-pair char code above ascii, it gets encoded to 2 or 3 bytes
    if (code < 0x8_00) {
      bytes[p++] = (code >> 6) | 0xc0
      bytes[p++] = (code & 0x3f) | 0x80
    } else {
      bytes[p++] = (code >> 12) | 0xe0
      bytes[p++] = ((code >> 6) & 0x3f) | 0x80
      bytes[p++] = (code & 0x3f) | 0x80
    }
  }

  return bytes.length === p ? bytes : bytes.slice(0, p)
}
