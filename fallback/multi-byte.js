import { asciiPrefix, decodeLatin1 } from './latin1.js'
import { getTable } from './multi-byte.table.cjs'

export const E_STRICT = 'Input is not well-formed for this encoding'

// TODO: optimize

// If the decoder is not cleared properly, state can be preserved between non-streaming calls, as also seen in Chrome and WebKit
// Example: t=new TextDecoder('iso-2022-jp');t.decode(Uint8Array.of(0x1b,0x28,0x49))t.decode(Uint8Array.of(0x21)).codePointAt(0).toString(16)
// It appears to be a bug there but we want to be aware of that so the algo has to be literal and do proper state changes on EOF,
// even though we clear the state by destroying the mapper instance, as the spec says

// All except iso-2022-jp are ASCII supersets
// When adding something that is not an ASCII superset, ajust the ASCII fast path
const EOF = -1
const mappers = {
  big5: () => {
    throw new RangeError('Unsupported encoding')
  },
  'euc-jp': () => {
    throw new RangeError('Unsupported encoding')
  },
  'euc-kr': () => {
    throw new RangeError('Unsupported encoding')
  },
  'iso-2022-jp': () => {
    const jis0208 = getTable('jis0208')
    // Per-letter of the spec, don't shortcut on state changes on EOF
    let dState = 1
    let oState = 1
    let lead = 0
    let out = false
    return (b) => {
      if (dState < 5) {
        if (b === EOF && dState < 4) return null
        if (b === 0x1b) {
          dState = 6 // escape start
          return -1
        }

        out = false
        if (dState === 2) {
          if (b === 0x5c) return 0xa5
          if (b === 0x7e) return 0x20_3e
        }
      }

      switch (dState) {
        case 1:
        case 2:
          // ASCII, Roman (common)
          if (b <= 0x7f && b !== 0x0e && b !== 0x0f) return b
          return -2
        case 3:
          // Katakana
          if (b >= 0x21 && b <= 0x5f) return 0xff_40 + b
          return -2
        case 4:
          // Leading byte
          if ((b >= 0x21) & (b <= 0x7e)) {
            lead = b
            dState = 5
            return -1
          }

          return -2
        case 5:
          // Trailing byte
          dState = 4
          if (b >= 0x21 && b <= 0x7e) {
            const cp = jis0208[(lead - 0x21) * 94 + b - 0x21]
            return cp !== undefined && cp !== 0xff_dd ? cp : -2
          }

          return -2
        case 6:
          // Escape start
          if (b === 0x24 || b === 0x28) {
            lead = b
            dState = 7
            return -1
          }

          out = false
          dState = oState
          return b === EOF ? -2 : -3
        case 7: {
          // Escape
          let s
          if (lead === 0x28) {
            // eslint-disable-next-line unicorn/prefer-switch
            if (b === 0x42) {
              s = 1
            } else if (b === 0x4a) {
              s = 2
            } else if (b === 0x49) {
              s = 3
            }
          } else if (lead === 0x24 && (b === 0x40 || b === 0x42)) {
            s = 4
          }

          lead = 0
          if (s) {
            dState = oState = s
            const output = out
            out = true
            return output ? -2 : -1
          }

          out = false
          dState = oState
          return b === EOF ? -3 : -4
        }
      }
    }
  },
  shift_jis: () => {
    const jis0208 = getTable('jis0208')
    let lead = 0
    return (b) => {
      if (b === EOF) {
        const ret = lead ? -2 : null
        lead = 0 // this clears state completely on EOF
        return ret
      }

      if (lead) {
        const l = lead
        lead = 0
        const offset = b < 0x7f ? 0x40 : 0x41
        const leadingOffset = l < 0xa0 ? 0x81 : 0xc1
        if ((b >= 0x40 && b <= 0x7e) || (b >= 0x80 && b <= 0xfc)) {
          const p = (l - leadingOffset) * 188 + b - offset
          if (p >= 8836 && p <= 10_715) return 0xe0_00 - 8836 + p // 16-bit
          const cp = jis0208[p]
          if (cp !== undefined && cp !== 0xff_dd) return cp
        }

        return -3 // restore 1 byte
      }

      if (b <= 0x80) return b
      if (b >= 0xa1 && b <= 0xdf) return 0xff_61 - 0xa1 + b
      if ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc)) {
        lead = b
        return -1
      }

      return -2
    }
  },
  gb18030: () => {
    throw new RangeError('Unsupported encoding')
  },
}

mappers.gbk = mappers.gb18030

export const multibyteSupported = (enc) => Object.hasOwn(mappers, enc)

export function multibyteDecoder(enc, loose = false) {
  if (!Object.hasOwn(mappers, enc)) throw new RangeError('Unsupported encoding')
  const onErr = loose
    ? () => '\uFFFD'
    : () => {
        throw new Error(E_STRICT)
      }

  // Input is assumed to be typechecked already
  let mapper
  const asciiSuperset = enc !== 'iso-2022-jp' // all others are ASCII supersets and can use fast path
  return (arr, stream = false) => {
    let res = ''
    const length = arr.length
    if (asciiSuperset && !mapper) {
      res = decodeLatin1(arr, 0, enc === 'iso-2022-jp' ? 0 : asciiPrefix(arr))
      if (res.length === arr.length) return res // ascii
    }

    if (!mapper) mapper = mappers[enc]()
    const end = stream ? length : length + 1
    for (let i = res.length; i < end; i++) {
      const x = i === length ? EOF : arr[i]
      const c = mapper(x)
      if (x === EOF && c === null) break // clean exit
      if (c === -1) continue // consuming
      if (c <= -2) {
        // -2: error, -3: error + restore 1 byte, etc
        res += onErr()
        i += c + 2
        if (c < -2 && x === EOF) i-- // if we restore something and attempted EOF, we should also restore EOF
      } else {
        res += String.fromCharCode(c) // no decoders return codepoints above 0xFFFF
      }
    }

    // Chrome and WebKit fail on this, we don't: completely destroy the old decoder instance when finished streaming
    // > If this’s do not flush is false, then set this’s decoder to a new instance of this’s encoding’s decoder,
    // > Set this’s do not flush to options["stream"]
    if (!stream) mapper = null

    return res
  }
}
