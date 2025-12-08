// A limited subset of TextEncoder / TextDecoder API

// We can't return native TextDecoder if it's present, as Node.js one is broken on windows-1252 and we fix that
// We are also faster than Node.js built-in on both TextEncoder and TextDecoder

/* eslint-disable unicorn/text-encoding-identifier-case, @exodus/import/no-unresolved */

import { utf16toString, utf16toStringLoose } from '@exodus/bytes/utf16.js'
import { utf8fromStringLoose, utf8toString, utf8toStringLoose } from '@exodus/bytes/utf8.js'
import { windows1252toString } from '@exodus/bytes/windows1252.js'

const Utf8 = 'utf-8'
const Utf16LE = 'utf-16le'
const Utf16BE = 'utf-16be'
const Win1252 = 'windows-1252'

// https://encoding.spec.whatwg.org/#names-and-labels
// prettier-ignore
const Utf8alias = new Set(['utf8', 'unicode-1-1-utf-8', 'unicode11utf8', 'unicode20utf8', 'x-unicode20utf8'])
// prettier-ignore
const Utf16LEalias = new Set(['utf-16', 'ucs-2', 'unicode', 'unicodefeff', 'iso-10646-ucs-2', 'csunicode']) // there is no 'utf16'
const Utf16BEalias = new Set(['unicodefffe'])
// prettier-ignore
const Win1252alias = new Set([
  'ascii', 'latin1', 'l1', 'us-ascii', 'ansi_x3.4-1968', 'cp1252', 'cp819', 'csisolatin1', 'ibm819',
  'iso-8859-1', 'iso-ir-100', 'iso8859-1', 'iso88591', 'iso_8859-1', 'iso_8859-1:1987', 'x-cp1252'
])

const replacementChar = '\uFFFD'

const normalizeEncoding = (encoding) => {
  const lower = `${encoding}`.trim().toLowerCase()
  if (Utf8 === lower || Utf16LE === lower || Utf16BE === lower || Win1252 === lower) return lower // fast path
  if (Utf8alias.has(lower)) return Utf8
  if (Utf16LEalias.has(lower)) return Utf16LE
  if (Utf16BEalias.has(lower)) return Utf16BE
  if (Win1252alias.has(lower)) return Win1252
  throw new RangeError('Only utf-8, utf-16le, utf-16be and windows-1252/latin1/ascii are supported')
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

export function TextEncoder() {
  define(this, 'encoding', 'utf-8')
}

TextEncoder.prototype.encode = function (str = '') {
  const res = utf8fromStringLoose(str)
  return res.byteOffset === 0 ? res : res.slice(0) // Ensure 0-offset. TODO: do we need this?
}

// npmjs.com/text-encoding polyfill doesn't support this at all
TextEncoder.prototype.encodeInto = function (str, target) {
  if (!(target instanceof Uint8Array)) throw new TypeError('Second argument must be an Uint8Array')
  const u8 = utf8fromStringLoose(str)
  if (target.length < u8.length) throw new RangeError('Truncation not supported') // TODO
  target.set(u8) // TODO: perf
  return { read: str.length, written: u8.length }
}

export function TextDecoder(encoding = Utf8, options = {}) {
  if (typeof options !== 'object') throw new TypeError('"options" argument must be of type object')
  const { fatal = false, ignoreBOM = false, stream = false } = options
  if (stream !== false) throw new TypeError('Option "stream" is not supported')

  define(this, 'encoding', normalizeEncoding(encoding))
  define(this, 'fatal', fatal)
  define(this, 'ignoreBOM', ignoreBOM)
}

// TODO: test behavior on BOM for LE/BE
TextDecoder.prototype.decode = function (input, { stream = false } = {}) {
  if (stream) throw new TypeError('Option "stream" is not supported')
  if (input === undefined) return ''
  let u = fromSource(input)
  let suffix = ''
  if (this.encoding === 'utf-8') {
    if (!this.ignoreBOM && u.byteLength >= 3 && u[0] === 0xef && u[1] === 0xbb && u[2] === 0xbf) {
      u = u.subarray(3)
    }

    return this.fatal ? utf8toString(u) : utf8toStringLoose(u)
  }

  if (this.encoding === 'utf-16le') {
    if (!this.ignoreBOM && u.byteLength >= 2 && u[0] === 0xff && u[1] === 0xfe) u = u.subarray(2)
    if (!this.fatal && u.byteLength % 2 !== 0) {
      u = u.subarray(0, -1)
      suffix = replacementChar
    }

    return (this.fatal ? utf16toString(u, 'uint8-le') : utf16toStringLoose(u, 'uint8-le')) + suffix
  }

  if (this.encoding === 'utf-16be') {
    if (!this.ignoreBOM && u.byteLength >= 2 && u[0] === 0xfe && u[1] === 0xff) u = u.subarray(2)
    if (!this.fatal && u.byteLength % 2 !== 0) {
      u = u.subarray(0, -1)
      suffix = replacementChar
    }

    return (this.fatal ? utf16toString(u, 'uint8-be') : utf16toStringLoose(u, 'uint8-be')) + suffix
  }

  if (this.encoding === 'windows-1252') return windows1252toString(u) // no BOM possible
  throw new RangeError('Unsupported encoding')
}
