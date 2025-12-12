const { utf16fromString, utf16toString } = require('@exodus/bytes/utf16.js') // eslint-disable-line @exodus/import/no-unresolved
const { fromBase64 } = require('@exodus/bytes/base64.js') // eslint-disable-line @exodus/import/no-unresolved
const { isLE } = require('./_utils.js')

// This is huge. It's _much_ smaller than https://npmjs.com/text-encoding though
// Exactly as mapped by the index table
// 0,x - hole of x empty elements
// n,c - continious [c, ...] of length n
// $.. - references to common chunks

let indices
const sizes = { jis0208: 11_104, jis0212: 7211, 'euc-kr': 23_750, gb18030: 23_940, big5: 19_782 }
const tables = new Map()

/* eslint-disable @exodus/mutable/no-param-reassign-prop-only */

function unwrap(res, t, pos, stringMode = false) {
  let code = 0
  for (let i = 0; i < t.length; i++) {
    let x = t[i]
    if (typeof x === 'number') {
      if (x === 0) {
        pos += t[++i]
      } else {
        if (x < 0) {
          code -= x
          x = 1
        } else {
          code += t[++i]
        }

        if (stringMode) {
          for (let k = 0; k < x; k++, pos++, code++) res[pos] = String.fromCodePoint(code)
        } else {
          for (let k = 0; k < x; k++, pos++, code++) res[pos] = code
        }
      }
    } else if (x[0] === '$' && Object.hasOwn(indices, x)) {
      pos = unwrap(res, indices[x], pos, stringMode) // self-reference using shared chunks
    } else if (stringMode) {
      const u8le = fromBase64(x)
      const xs = [...utf16toString(u8le, 'uint8-le')] // splits by codepoints
      for (let i = 0; i < xs.length; ) res[pos++] = xs[i++] // TODO: splice?
      code = xs[xs.length - 1].codePointAt(0) + 1
    } else {
      const u8le = fromBase64(x)
      const u16 = isLE
        ? new Uint16Array(u8le.buffer, u8le.byteOffset, u8le.byteLength / 2)
        : utf16fromString(utf16toString(u8le, 'uint8-le')) // TODO: just use swap. !isLE is exotic though
      res.set(u16, pos)
      pos += u16.length
      code = u16[u16.length - 1] + 1
    }
  }

  return pos
}

function getTable(id) {
  const cached = tables.get(id)
  if (cached) return cached

  if (!indices) indices = require('./multi-byte.encodings.json') // lazy-load
  if (!Object.hasOwn(indices, id)) throw new Error('Unknown encoding')
  if (!indices[id]) throw new Error('Table already used (likely incorrect bundler dedupe)')

  let res
  if (id.endsWith('-ranges')) {
    res = []
    let c = 0, d = 0 // prettier-ignore
    for (const [a, b] of indices[id]) res.push([(c += a), (d += b)])
  } else if (id === 'big5') {
    if (!Object.hasOwn(sizes, id)) throw new Error('Unknown encoding')
    res = new Array(sizes[id]) // array of strings or undefined
    unwrap(res, indices[id], 0, true)
    // Pointer code updates are embedded into the table
    res[1133] = '\xCA\u0304'
    res[1135] = '\xCA\u030C'
    res[1164] = '\xEA\u0304'
    res[1166] = '\xEA\u030C'
  } else {
    if (!Object.hasOwn(sizes, id)) throw new Error('Unknown encoding')
    res = new Uint16Array(sizes[id])
    res.fill(0xff_fd)
    unwrap(res, indices[id], 0, false)
  }

  indices[id] = null // gc
  tables.set(id, res)
  return res
}

module.exports = { getTable, sizes }
