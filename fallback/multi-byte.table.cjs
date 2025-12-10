const { utf16fromString } = require('@exodus/bytes/utf16.js') // eslint-disable-line @exodus/import/no-unresolved

let raw
const tables = new Map()

function getTable(id) {
  const cached = tables.get(id)
  if (cached) return cached

  if (!raw) raw = require('./multi-byte.encodings.js') // lazy-load
  const { indices, sizes } = raw
  if (!Object.hasOwn(indices, id) || !Object.hasOwn(sizes, id)) throw new Error('Unknown encoding')
  if (!indices[id]) throw new Error('Table already used (likely incorrect bundler dedupe)')

  const res = new Uint16Array(sizes[id])
  res.fill(0xff_fd)
  let pos = 0
  for (const chunk of indices[id]) {
    if (typeof chunk === 'number') {
      pos += chunk
    } else if (Array.isArray(chunk)) {
      const [first, len] = chunk
      for (let i = 0; i < len; i++, pos++) res[pos] = first + i
    } else {
      res.set(utf16fromString(chunk), pos)
      pos += chunk.length
    }
  }

  indices[id] = null // gc
  tables.set(id, res)
  return res
}

module.exports = { getTable }
