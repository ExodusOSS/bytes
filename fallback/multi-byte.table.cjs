const { utf16fromString } = require('@exodus/bytes/utf16.js') // eslint-disable-line @exodus/import/no-unresolved

// This is huge. It's _much_ smaller than https://npmjs.com/text-encoding though
// Exactly as mapped by the index table, numbers denote holes, arrays denote continious [first, length]
// Parts with $ are references to common chunks

let indices
const sizes = { jis0208: 11_104, 'euc-kr': 23_750 }
const tables = new Map()

function getTable(id) {
  const cached = tables.get(id)
  if (cached) return cached

  if (!indices) indices = require('./multi-byte.encodings.json') // lazy-load
  if (!Object.hasOwn(indices, id) || !Object.hasOwn(sizes, id)) throw new Error('Unknown encoding')
  if (!indices[id]) throw new Error('Table already used (likely incorrect bundler dedupe)')

  const res = new Uint16Array(sizes[id])
  res.fill(0xff_fd)
  let pos = 0
  for (const x of indices[id]) {
    if (typeof x === 'number') {
      pos += x
    } else if (Array.isArray(x)) {
      const [first, len] = x
      for (let i = 0; i < len; i++, pos++) res[pos] = first + i
    } else if (x[0] === '$' && Object.hasOwn(indices, x)) {
      // Self-reference to a common chunk. Not deep, there are only strings there
      for (const y of indices[x]) {
        res.set(utf16fromString(y), pos)
        pos += y.length
      }
    } else {
      res.set(utf16fromString(x), pos)
      pos += x.length
    }
  }

  indices[id] = null // gc
  tables.set(id, res)
  return res
}

module.exports = { getTable, sizes }
