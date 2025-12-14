// A limited subset of TextEncoder / TextDecoder API

// We can't return native TextDecoder if it's present, as Node.js one is broken on windows-1252 and we fix that
// We are also faster than Node.js built-in on both TextEncoder and TextDecoder

/* eslint-disable @exodus/import/no-unresolved */

import { utf16toString, utf16toStringLoose } from '@exodus/bytes/utf16.js'
import { utf8fromStringLoose, utf8toString, utf8toStringLoose } from '@exodus/bytes/utf8.js'
import { createDecoder as createDecoderMultiByte } from '@exodus/bytes/multi-byte.js'
import { createDecoder as createDecoderSingleByte } from '@exodus/bytes/single-byte.js'
import { multibyteSupported } from './fallback/multi-byte.js'
import labels from './fallback/encoding.labels.js'
import { unfinishedBytes } from './fallback/encoding.util.js'

const E_OPTIONS = 'The "options" argument must be of type object'
const replacementChar = '\uFFFD'

let labelsMap
const normalizeEncoding = (enc) => {
  // fast path
  if (enc === 'utf-8' || enc === 'utf8') return 'utf-8'
  if (enc === 'windows-1252' || enc === 'ascii' || enc === 'latin1') return 'windows-1252'
  // full map
  let low = `${enc}`.toLowerCase()
  if (low !== low.trim()) low = low.replace(/^[\t\n\f\r ]+/, '').replace(/[\t\n\f\r ]+$/, '') // only ASCII whitespace
  if (Object.hasOwn(labels, low) && low !== 'replacement') return low
  if (!labelsMap) {
    labelsMap = new Map()
    for (const [label, aliases] of Object.entries(labels)) {
      for (const alias of aliases) labelsMap.set(alias, label)
    }
  }

  const mapped = labelsMap.get(low)
  if (mapped && mapped !== 'replacement') return mapped
  throw new RangeError('Unknown encoding')
}

const define = (obj, key, value) => Object.defineProperty(obj, key, { value, writable: false })

const fromSource = (x) => {
  if (x instanceof Uint8Array) return x
  if (x instanceof ArrayBuffer) return new Uint8Array(x)
  if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength)
  if (globalThis.SharedArrayBuffer && x instanceof globalThis.SharedArrayBuffer) {
    return new Uint8Array(x.buffer, x.byteOffset, x.byteLength)
  }

  throw new TypeError('Argument must be a SharedArrayBuffer, ArrayBuffer or ArrayBufferView')
}

function unicodeDecoder(encoding, loose) {
  if (encoding === 'utf-8') return loose ? utf8toStringLoose : utf8toString // likely
  const form = encoding === 'utf-16le' ? 'uint8-le' : 'uint8-be'
  return loose ? (u) => utf16toStringLoose(u, form) : (u) => utf16toString(u, form)
}

export class TextDecoder {
  #decode
  #unicode
  #multibyte
  #chunk
  #canBOM

  constructor(encoding = 'utf-8', options = {}) {
    if (typeof options !== 'object') throw new TypeError(E_OPTIONS)
    const enc = normalizeEncoding(encoding)
    define(this, 'encoding', enc)
    define(this, 'fatal', Boolean(options.fatal))
    define(this, 'ignoreBOM', Boolean(options.ignoreBOM))
    this.#unicode = enc === 'utf-8' || enc === 'utf-16le' || enc === 'utf-16be'
    this.#multibyte = !this.#unicode && enc !== 'windows-1252' && multibyteSupported(enc)
    this.#canBOM = this.#unicode && !this.ignoreBOM
  }

  get [Symbol.toStringTag]() {
    return 'TextDecoder'
  }

  // TODO: test behavior on BOM for LE/BE
  decode(input, options = {}) {
    if (typeof options !== 'object') throw new TypeError(E_OPTIONS)
    const stream = Boolean(options.stream)
    let u = input === undefined ? new Uint8Array() : fromSource(input)

    if (this.#unicode) {
      if (this.#chunk) {
        // TODO: optimize by decoding into a prefix, this is slow
        const a = new Uint8Array(u.length + this.#chunk.length)
        a.set(this.#chunk)
        a.set(u, this.#chunk.length)
        u = a
        this.#chunk = null
      } else if (u.byteLength === 0) {
        if (!stream) this.#canBOM = !this.ignoreBOM
        return ''
      }

      // For non-stream utf-8 we don't have to do this as it matches utf8toStringLoose already
      // For non-stream loose utf-16 we still have to do this as this API supports uneven byteLength unlike utf16toStringLoose
      let suffix = ''
      if (stream || (!this.fatal && this.encoding !== 'utf-8')) {
        const trail = unfinishedBytes(u, this.encoding)
        if (trail > 0) {
          if (stream) {
            this.#chunk = Uint8Array.from(u.subarray(-trail)) // copy
          } else {
            // non-fatal mode as already checked
            suffix = replacementChar
          }

          u = u.subarray(0, -trail)
        }
      }

      if (this.#canBOM) {
        const bom = this.#findBom(u)
        if (bom) {
          u = u.subarray(bom)
          if (stream) this.#canBOM = false
        }
      }

      if (!this.#decode) this.#decode = unicodeDecoder(this.encoding, !this.fatal)
      try {
        const res = this.#decode(u) + suffix
        if (res.length > 0 && stream) this.#canBOM = false

        if (!stream) this.#canBOM = !this.ignoreBOM
        return res
      } catch (err) {
        this.#chunk = null // reset unfinished chunk on errors
        throw err
      }

      // eslint-disable-next-line no-else-return
    } else if (this.#multibyte) {
      if (!this.#decode) this.#decode = createDecoderMultiByte(this.encoding, !this.fatal) // can contain state!
      return this.#decode(u, stream)
    } else {
      if (!this.#decode) this.#decode = createDecoderSingleByte(this.encoding, !this.fatal)
      return this.#decode(u)
    }
  }

  #findBom(u) {
    switch (this.encoding) {
      case 'utf-8':
        return u.byteLength >= 3 && u[0] === 0xef && u[1] === 0xbb && u[2] === 0xbf ? 3 : 0
      case 'utf-16le':
        return u.byteLength >= 2 && u[0] === 0xff && u[1] === 0xfe ? 2 : 0
      case 'utf-16be':
        return u.byteLength >= 2 && u[0] === 0xfe && u[1] === 0xff ? 2 : 0
    }

    throw new Error('Unreachable')
  }
}

export class TextEncoder {
  constructor() {
    define(this, 'encoding', 'utf-8')
  }

  get [Symbol.toStringTag]() {
    return 'TextEncoder'
  }

  encode(str = '') {
    if (typeof str !== 'string') str = `${str}`
    const res = utf8fromStringLoose(str)
    return res.byteOffset === 0 ? res : res.slice(0) // Ensure 0-offset. TODO: do we need this?
  }

  encodeInto(str, target) {
    if (typeof str !== 'string') str = `${str}`
    if (!(target instanceof Uint8Array)) throw new TypeError('Target must be an Uint8Array')
    if (target.buffer.detached) return { read: 0, written: 0 } // Until https://github.com/whatwg/encoding/issues/324 is resolved

    let u8 = utf8fromStringLoose(str) // TODO: perf?
    let read
    if (target.length >= u8.length) {
      read = str.length
    } else if (u8.length === str.length) {
      if (u8.length > target.length) u8 = u8.subarray(0, target.length) // ascii can be truncated
      read = u8.length
    } else {
      u8 = u8.subarray(0, target.length)
      const unfinished = unfinishedBytes(u8, 'utf-8')
      if (unfinished > 0) u8 = u8.subarray(0, u8.length - unfinished)

      // We can do this because loose str -> u8 -> str preserves length, unlike loose u8 -> str -> u8
      // Each unpaired surrogate (1 charcode) is replaced with a single charcode
      read = utf8toStringLoose(u8).length // FIXME: Converting back is very inefficient
    }

    try {
      target.set(u8)
    } catch {
      return { read: 0, written: 0 } // see above, likely detached but no .detached property support
    }

    return { read, written: u8.length }
  }
}
