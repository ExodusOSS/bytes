const { utf16fromString } = require('@exodus/bytes/utf16.js') // eslint-disable-line @exodus/import/no-unresolved

// This is huge. It's _much_ smaller than https://npmjs.com/text-encoding though
// Exactly as mapped by the index table, negative numbers denote holes, positive denote continious [first, length]
// Parts with $ are references to common chunks

let indices
const sizes = { jis0208: 11_104, jis0212: 7211, 'euc-kr': 23_750, gb18030: 23_940 }
const tables = new Map()

/* eslint-disable @exodus/mutable/no-param-reassign-prop-only */

function unwrap(res, t, pos) {
  for (let i = 0; i < t.length; i++) {
    const x = t[i]
    if (typeof x === 'number') {
      if (x < 0) {
        pos -= x
      } else {
        const len = t[++i]
        for (let k = 0; k < len; k++, pos++) res[pos] = x + k
      }
    } else if (x[0] === '$' && Object.hasOwn(indices, x)) {
      pos = unwrap(res, indices[x], pos) // self-reference using shared chunks
    } else {
      res.set(utf16fromString(x), pos)
      pos += x.length
    }
  }

  return pos
}

function getTable(id) {
  const cached = tables.get(id)
  if (cached) return cached

  if (!indices) indices = require('./multi-byte.encodings.json') // lazy-load
  if (!Object.hasOwn(indices, id) || !Object.hasOwn(sizes, id)) throw new Error('Unknown encoding')
  if (!indices[id]) throw new Error('Table already used (likely incorrect bundler dedupe)')

  const res = new Uint16Array(sizes[id])
  res.fill(0xff_fd)
  unwrap(res, indices[id], 0)
  indices[id] = null // gc
  tables.set(id, res)
  return res
}

module.exports = { getTable, sizes }
