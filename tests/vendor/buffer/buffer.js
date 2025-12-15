import { fromBase64any, toBase64 } from '@exodus/bytes/base64.js'
import { fromHex, toHex } from '@exodus/bytes/hex.js'
import { utf8fromStringLoose, utf8toStringLoose } from '@exodus/bytes/utf8.js'

// Warning: this implementation is just for testing, not universal

const toString = function (enc = 'utf8') {
  try {
    delete this.toString
    if (enc === 'base64') return toBase64(this)
    if (enc === 'hex') return toHex(this)
    if (enc === 'binary') return String.fromCharCode(...this) // useful for cross-comparison
    if (enc === 'utf8' || enc === 'utf-8' || enc === 'ascii') return utf8toStringLoose(this)
  } finally {
    wrap(this) // add back
  }

  throw new Error(`Unsupported: ${enc}`)
}

const wrap = (b) => {
  Object.defineProperty(b, 'toString', { configurable: true, value: toString })
  return b
}

const B = function (str, enc) {
  if (typeof str === 'number') {
    if (enc !== undefined) throw new Error('Unsupported')
    return wrap(B.alloc(str))
  }

  if (Array.isArray(str)) {
    if (enc !== undefined) throw new Error('Unsupported')
    return wrap(Buffer.from(str))
  }

  enc = enc ?? 'utf8'
  if (enc === 'base64') return wrap(fromBase64any(str.replaceAll(/\s/gu, ''), { format: 'buffer' }))
  if (enc === 'hex') return wrap(fromHex(str, 'buffer'))
  if (enc === 'utf8' || enc === 'utf-8' || enc === 'ascii') {
    return wrap(utf8fromStringLoose(str, 'buffer'))
  }

  throw new Error(`Unsupported: ${enc}`)
}

B.from = B

B.alloc = (size, fill, enc = 'utf8') => {
  if (typeof fill === 'string') fill = B(fill, enc)
  return wrap(Buffer.alloc(size, fill, enc))
}

export { B }
