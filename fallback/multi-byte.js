import { asciiPrefix, decodeLatin1 } from './latin1.js'
import { getTable } from './multi-byte.table.js'

export const E_STRICT = 'Input is not well-formed for this encoding'

// TODO: optimize

// If the decoder is not cleared properly, state can be preserved between non-streaming calls!
// See comment about fatal stream

// All except iso-2022-jp are ASCII supersets
// When adding something that is not an ASCII superset, ajust the ASCII fast path
const REP = 0xff_fd
const mappers = {
  // https://encoding.spec.whatwg.org/#euc-kr-decoder
  'euc-kr': () => {
    const euc = getTable('euc-kr')
    let lead = 0

    const pushback = []
    const bytes = (b) => {
      if (lead) {
        const cp = b >= 0x41 && b <= 0xfe ? euc[(lead - 0x81) * 190 + b - 0x41] : undefined
        lead = 0
        if (cp !== undefined && cp !== REP) return cp
        if (b < 128) pushback.push(b)
        return -2
      }

      if (b < 128) return b
      if (b < 0x81 || b === 0xff) return -2
      lead = b
      return -1
    }

    const eof = () => {
      if (!lead) return null
      lead = 0
      return -2
    }

    return { bytes, eof, pushback }
  },
  // https://encoding.spec.whatwg.org/#euc-jp-decoder
  'euc-jp': () => {
    const jis0208 = getTable('jis0208')
    const jis0212 = getTable('jis0212')
    let j12 = false
    let lead = 0

    const pushback = []
    const bytes = (b) => {
      if (lead === 0x8e && b >= 0xa1 && b <= 0xdf) {
        lead = 0
        return 0xfe_c0 + b
      }

      if (lead === 0x8f && b >= 0xa1 && b <= 0xfe) {
        j12 = true
        lead = b
        return -1
      }

      if (lead) {
        let cp
        if (lead >= 0xa1 && lead <= 0xfe && b >= 0xa1 && b <= 0xfe) {
          cp = (j12 ? jis0212 : jis0208)[(lead - 0xa1) * 94 + b - 0xa1]
        }

        lead = 0
        j12 = false
        if (cp !== undefined && cp !== REP) return cp
        if (b < 128) pushback.push(b)
        return -2
      }

      if (b < 128) return b
      if ((b < 0xa1 && b !== 0x8e && b !== 0x8f) || b === 0xff) return -2
      lead = b
      return -1
    }

    // eslint-disable-next-line sonarjs/no-identical-functions
    const eof = () => {
      if (!lead) return null
      lead = 0
      return -2
    }

    return { bytes, eof, pushback }
  },
  // https://encoding.spec.whatwg.org/#iso-2022-jp-decoder
  // Per-letter of the spec, don't shortcut on state changes on EOF. Some code is regrouped but preserving the logic
  'iso-2022-jp': () => {
    const jis0208 = getTable('jis0208')
    const EOF = -1
    let dState = 1
    let oState = 1
    let lead = 0
    let out = false

    const pushback = []
    const bytes = (b) => {
      if (dState < 5) {
        if (b === EOF) return null
        if (b === 0x1b) {
          dState = 6 // escape start
          return -1
        }
      }

      switch (dState) {
        case 1:
        case 2:
          // ASCII, Roman (common)
          out = false
          if (dState === 2) {
            if (b === 0x5c) return 0xa5
            if (b === 0x7e) return 0x20_3e
          }

          if (b <= 0x7f && b !== 0x0e && b !== 0x0f) return b
          return -2
        case 3:
          // Katakana
          out = false
          if (b >= 0x21 && b <= 0x5f) return 0xff_40 + b
          return -2
        case 4:
          // Leading byte
          out = false
          if ((b >= 0x21) & (b <= 0x7e)) {
            lead = b
            dState = 5
            return -1
          }

          return -2
        case 5:
          // Trailing byte
          out = false
          if (b === 0x1b) {
            dState = 6 // escape start
            return -2
          }

          dState = 4
          if (b >= 0x21 && b <= 0x7e) {
            const cp = jis0208[(lead - 0x21) * 94 + b - 0x21]
            return cp !== undefined && cp !== REP ? cp : -2
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
          if (b !== EOF) pushback.push(b)
          return -2
        case 7: {
          // Escape
          const l = lead
          lead = 0
          let s
          if (l === 0x28) {
            // eslint-disable-next-line unicorn/prefer-switch
            if (b === 0x42) {
              s = 1
            } else if (b === 0x4a) {
              s = 2
            } else if (b === 0x49) {
              s = 3
            }
          } else if (l === 0x24 && (b === 0x40 || b === 0x42)) {
            s = 4
          }

          if (s) {
            dState = oState = s
            const output = out
            out = true
            return output ? -2 : -1
          }

          out = false
          dState = oState
          if (b !== EOF) pushback.push(b)
          pushback.push(l)
          return -2
        }
      }
    }

    const eof = () => bytes(EOF)

    return { bytes, eof, pushback }
  },
  // https://encoding.spec.whatwg.org/#shift_jis-decoder
  shift_jis: () => {
    const jis0208 = getTable('jis0208')
    let lead = 0

    const pushback = []
    const bytes = (b) => {
      if (lead) {
        const l = lead
        lead = 0
        if (b >= 0x40 && b <= 0xfc && b !== 0x7f) {
          const p = (l - (l < 0xa0 ? 0x81 : 0xc1)) * 188 + b - (b < 0x7f ? 0x40 : 0x41)
          if (p >= 8836 && p <= 10_715) return 0xe0_00 - 8836 + p // 16-bit
          const cp = jis0208[p]
          if (cp !== undefined && cp !== REP) return cp
        }

        if (b < 128) pushback.push(b)
        return -2
      }

      if (b <= 0x80) return b // 0x80 is allowed
      if (b >= 0xa1 && b <= 0xdf) return 0xff_61 - 0xa1 + b
      if (b < 0x81 || (b > 0x9f && b < 0xe0) || b > 0xfc) return -2
      lead = b
      return -1
    }

    // eslint-disable-next-line sonarjs/no-identical-functions
    const eof = () => {
      if (!lead) return null
      lead = 0 // this clears state completely on EOF
      return -2
    }

    return { bytes, eof, pushback }
  },
  // https://encoding.spec.whatwg.org/#gbk-decoder
  gbk: () => mappers.gb18030(), // 10.1.1. GBK’s decoder is gb18030’s decoder
  // https://encoding.spec.whatwg.org/#gb18030-decoder
  gb18030: () => {
    const gb18030 = getTable('gb18030')
    const gb18030r = getTable('gb18030-ranges')
    let g1 = 0, g2 = 0, g3 = 0 // prettier-ignore
    const index = (p) => {
      if ((p > 39_419 && p < 189_000) || p > 1_237_575) return
      if (p === 7457) return 0xe7_c7
      let a = 0, b = 0 // prettier-ignore
      for (const [c, d] of gb18030r) {
        if (c > p) break
        a = c
        b = d
      }

      return b + p - a
    }

    const pushback = []
    const bytes = (b) => {
      if (g3) {
        if (b < 0x30 || b > 0x39) {
          pushback.push(b, g3, g2)
          g1 = g2 = g3 = 0
          return -2
        }

        const cp = index((g1 - 0x81) * 12_600 + (g2 - 0x30) * 1260 + (g3 - 0x81) * 10 + b - 0x30)
        g1 = g2 = g3 = 0
        if (cp !== undefined) return cp // Can validly return replacement
        return -2
      }

      if (g2) {
        if (b >= 0x81 && b <= 0xfe) {
          g3 = b
          return -1
        }

        pushback.push(b, g2)
        g1 = g2 = 0
        return -2
      }

      if (g1) {
        if (b >= 0x30 && b <= 0x39) {
          g2 = b
          return -1
        }

        let cp
        if (b >= 0x40 && b <= 0xfe && b !== 0x7f) {
          cp = gb18030[(g1 - 0x81) * 190 + b - (b < 0x7f ? 0x40 : 0x41)]
        }

        g1 = 0
        if (cp !== undefined && cp !== REP) return cp
        if (b < 128) pushback.push(b)
        return -2
      }

      if (b < 128) return b
      if (b === 0x80) return 0x20_ac
      if (b === 0xff) return -2
      g1 = b
      return -1
    }

    const eof = () => {
      if (!g1 && !g2 && !g3) return null
      g1 = g2 = g3 = 0
      return -2
    }

    return { bytes, eof, pushback }
  },
}

export const isAsciiSuperset = (enc) => enc !== 'iso-2022-jp' // all others are ASCII supersets and can use fast path

export function multibyteDecoder(enc, loose = false) {
  if (enc === 'big5') return big5decoder(loose)
  if (!Object.hasOwn(mappers, enc)) throw new RangeError('Unsupported encoding')

  // Input is assumed to be typechecked already
  let mapper
  const asciiSuperset = isAsciiSuperset(enc)
  return (arr, stream = false) => {
    const onErr = loose
      ? () => '\uFFFD'
      : () => {
          mapper.pushback.length = 0 // the queue is cleared on returning an error
          // The correct way per spec seems to be not destoying the decoder state in stream mode, even when fatal
          // Decoders big5, euc-jp, euc-kr, shift_jis, gb18030 / gbk - all clear state before throwing unless EOF, so not affected
          // iso-2022-jp is the only tricky one one where this !stream check matters in non-stream mode
          if (!stream) mapper = null // destroy state, effectively the same as 'do not flush' = false, but early
          throw new TypeError(E_STRICT)
        }

    let res = ''
    const length = arr.length
    if (asciiSuperset && !mapper) {
      res = decodeLatin1(arr, 0, asciiPrefix(arr))
      if (res.length === arr.length) return res // ascii
    }

    if (!mapper) mapper = mappers[enc]()
    const { bytes, eof, pushback } = mapper
    let i = res.length

    // First, dump everything until EOF
    // Same as the full loop, but without EOF handling
    while (i < length || pushback.length > 0) {
      const c = bytes(pushback.length > 0 ? pushback.pop() : arr[i++])
      if (c >= 0) {
        res += String.fromCodePoint(c) // gb18030 returns codepoints above 0xFFFF from ranges
      } else if (c === -2) {
        res += onErr()
      }
    }

    // Then, dump EOF. This needs the same loop as the characters can be pushed back
    // TODO: only some encodings need this, most can be optimized
    if (!stream) {
      while (i <= length || pushback.length > 0) {
        const isEOF = i === length && pushback.length === 0
        const c = isEOF ? eof() : bytes(pushback.length > 0 ? pushback.pop() : arr[i++])
        if (isEOF && c === null) break // clean exit
        if (c === -1) continue // consuming
        if (c === -2) {
          res += onErr()
        } else {
          res += String.fromCodePoint(c) // gb18030 returns codepoints above 0xFFFF from ranges
        }
      }
    }

    // Chrome and WebKit fail on this, we don't: completely destroy the old decoder instance when finished streaming
    // > If this’s do not flush is false, then set this’s decoder to a new instance of this’s encoding’s decoder,
    // > Set this’s do not flush to options["stream"]
    if (!stream) mapper = null

    return res
  }
}

// The only decoder which returns multiple codepoints per byte, also has non-charcode codepoints
// We store that as strings
function big5decoder(loose) {
  // Input is assumed to be typechecked already
  let lead = 0
  let big5
  return (arr, stream = false) => {
    const onErr = loose
      ? () => '\uFFFD'
      : () => {
          // Lead is always already cleared before throwing
          throw new TypeError(E_STRICT)
        }

    let res = ''
    const length = arr.length
    if (!lead) {
      res = decodeLatin1(arr, 0, asciiPrefix(arr))
      if (res.length === arr.length) return res // ascii
    }

    if (!big5) big5 = getTable('big5')
    for (let i = res.length; i < length; i++) {
      const b = arr[i]
      if (lead) {
        let cp
        if ((b >= 0x40 && b <= 0x7e) || (b >= 0xa1 && b !== 0xff)) {
          cp = big5[(lead - 0x81) * 157 + b - (b < 0x7f ? 0x40 : 0x62)]
        }

        lead = 0
        if (cp) {
          res += cp // strings
        } else {
          res += onErr()
          // same as pushing it back: lead is cleared, pushed back can't contain more than 1 byte
          if (b < 128) res += String.fromCharCode(b)
        }
      } else if (b < 128) {
        res += String.fromCharCode(b)
      } else if (b < 0x81 || b === 0xff) {
        res += onErr()
      } else {
        lead = b
      }
    }

    if (!stream && lead) {
      // Destroy decoder state
      lead = 0
      res += onErr()
    }

    return res
  }
}
