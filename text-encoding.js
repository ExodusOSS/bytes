// A limited subset of TextEncoder / TextDecoder API

// We can't return native TextDecoder if it's present, as Node.js one is broken on windows-1252 and we fix that
// We are also faster than Node.js built-in on both TextEncoder and TextDecoder

/* eslint-disable @exodus/import/no-unresolved */

import { utf16toString, utf16toStringLoose } from '@exodus/bytes/utf16.js'
import { utf8fromStringLoose, utf8toString, utf8toStringLoose } from '@exodus/bytes/utf8.js'
import { createDecoder } from '@exodus/bytes/single-byte.js'
import labels from './fallback/text-encoding.labels.js'

const E_OPTIONS = 'The "options" argument must be of type object'
const replacementChar = '\uFFFD'

let labelsMap
const normalizeEncoding = (encoding) => {
  const lower = `${encoding}`.trim().toLowerCase()
  // fast path
  if (lower === 'utf-8' || lower === 'utf8') return 'utf-8'
  if (lower === 'windows-1252' || lower === 'ascii' || lower === 'latin1') return 'windows-1252'
  // Full map
  if (Object.hasOwn(labels, lower)) return lower
  if (!labelsMap) {
    labelsMap = new Map()
    for (const [label, aliases] of Object.entries(labels)) {
      for (const alias of aliases) labelsMap.set(alias, label)
    }
  }

  const mapped = labelsMap.get(lower)
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

export class TextEncoder {
  constructor() {
    define(this, 'encoding', 'utf-8')
  }

  encode(str = '') {
    const res = utf8fromStringLoose(str)
    return res.byteOffset === 0 ? res : res.slice(0) // Ensure 0-offset. TODO: do we need this?
  }

  // npmjs.com/text-encoding polyfill doesn't support this at all
  encodeInto(str, target) {
    if (!(target instanceof Uint8Array)) throw new TypeError('Target must be an Uint8Array')
    const u8 = utf8fromStringLoose(str)
    if (target.length < u8.length) throw new RangeError('Truncation not supported') // TODO
    target.set(u8) // TODO: perf
    return { read: str.length, written: u8.length }
  }
}

export class TextDecoder {
  #decode

  constructor(encoding = 'utf-8', options = {}) {
    if (typeof options !== 'object') throw new TypeError(E_OPTIONS)
    const { fatal = false, ignoreBOM = false, stream = false } = options
    if (stream !== false) throw new TypeError('Option "stream" is not supported')

    define(this, 'encoding', normalizeEncoding(encoding))
    define(this, 'fatal', fatal)
    define(this, 'ignoreBOM', ignoreBOM)
  }

  // TODO: test behavior on BOM for LE/BE
  decode(input, options = {}) {
    if (typeof options !== 'object') throw new TypeError(E_OPTIONS)
    const { stream = false } = options
    if (stream) throw new TypeError('Option "stream" is not supported')
    if (input === undefined) return ''
    let u = fromSource(input)

    if (this.encoding === 'utf-8') {
      if (!this.ignoreBOM && u.byteLength >= 3 && u[0] === 0xef && u[1] === 0xbb && u[2] === 0xbf) {
        u = u.subarray(3)
      }

      return this.fatal ? utf8toString(u) : utf8toStringLoose(u)
    }

    if (this.encoding === 'utf-16le') {
      let suffix = ''
      if (!this.ignoreBOM && u.byteLength >= 2 && u[0] === 0xff && u[1] === 0xfe) u = u.subarray(2)
      if (!this.fatal && u.byteLength % 2 !== 0) {
        u = u.subarray(0, -1)
        suffix = replacementChar
      }

      return (
        (this.fatal ? utf16toString(u, 'uint8-le') : utf16toStringLoose(u, 'uint8-le')) + suffix
      )
    }

    if (this.encoding === 'utf-16be') {
      let suffix = ''
      if (!this.ignoreBOM && u.byteLength >= 2 && u[0] === 0xfe && u[1] === 0xff) u = u.subarray(2)
      if (!this.fatal && u.byteLength % 2 !== 0) {
        u = u.subarray(0, -1)
        suffix = replacementChar
      }

      return (
        (this.fatal ? utf16toString(u, 'uint8-be') : utf16toStringLoose(u, 'uint8-be')) + suffix
      )
    }

    if (!this.#decode) this.#decode = createDecoder(this.encoding) // single-byte
    return this.#decode(u, !this.fatal) // no BOM possible
  }
}
