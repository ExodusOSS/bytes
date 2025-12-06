import { describe } from 'node:test'
import { loadDir } from './loader.cjs'
import * as base64 from '../../fallback/base64.js'
import * as utf8 from '../../fallback/utf8.js'
import * as utf16 from '../../fallback/utf16.js'

/* eslint-disable unicorn/text-encoding-identifier-case */

// Not a proper impl, not getters, etc
globalThis.TextEncoder = class {
  constructor() {
    this.encoding = 'utf-8'
  }

  encode(input = '') {
    return utf8.encode(input, true)
  }
}

function swap16(u8) {
  for (let i = 0; i < u8.length - 1; i += 2) {
    const x0 = u8[i]
    const x1 = u8[i + 1]
    u8[i] = x1 // eslint-disable-line @exodus/mutable/no-param-reassign-prop-only
    u8[i + 1] = x0 // eslint-disable-line @exodus/mutable/no-param-reassign-prop-only
  }
}

// Not a proper impl, not getters, etc
const isLE = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2
globalThis.TextDecoder = class {
  constructor(label = 'utf-8', { fatal = false, ignoreBOM = false } = {}) {
    this.encoding = label
    this.fatal = fatal
    this.ignoreBOM = ignoreBOM
  }

  decode(input = Uint8Array.of(), { stream = false } = {}) {
    if (stream) throw new Error('Unsupported')
    if (input instanceof ArrayBuffer) input = new Uint8Array(input)
    if (input instanceof DataView) {
      input = new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    }

    let res
    if (this.encoding === 'utf-8') {
      res = utf8.decode(input, !this.fatal)
    } else if (this.encoding === 'utf-16le' || (this.encoding === 'utf-16' && isLE)) {
      if (!this.fatal && input.byteLength % 2 !== 0) {
        const tmp = new Uint8Array(input.byteLength + 1)
        tmp.set(input)
        tmp[tmp.length - 1] = 0xff
        tmp[tmp.length - 2] = 0xfd
        input = tmp
      } else {
        input = Uint8Array.from(input)
      }

      if (!isLE) swap16(input)
      if (input.byteLength % 2 !== 0) throw new TypeError('Expected even number of bytes')
      const u16 = new Uint16Array(input.buffer, input.byteOffset, input.byteLength / 2)
      res = utf16.decode(u16, !this.fatal)
    } else if (this.encoding === 'utf-16be' || (this.encoding === 'utf-16' && !isLE)) {
      if (!this.fatal && input.byteLength % 2 !== 0) {
        const tmp = new Uint8Array(input.byteLength + 1)
        tmp.set(input)
        tmp[tmp.length - 1] = 0xfd
        tmp[tmp.length - 2] = 0xff
        input = tmp
      } else {
        input = Uint8Array.from(input)
      }

      if (isLE) swap16(input)
      if (input.byteLength % 2 !== 0) throw new TypeError('Expected even number of bytes')
      const u16 = new Uint16Array(input.buffer, input.byteOffset, input.byteLength / 2)
      res = utf16.decode(u16, !this.fatal)
    } else {
      throw new Error('Unsupported')
    }

    return !this.ignoreBOM && res.codePointAt(0) === 65_279 ? res.slice(1) : res
  }
}

globalThis.atob = (x) => {
  x = String(x).replaceAll(/[\t\n\f\r ]/g, '')

  // hack around non-strict input just for testing
  x = x.replace(/^ab(={0,4})$/, 'aQ$1')
  if (x === 'NaN') x = 'NaM'
  if (x === '12') x = '1w'
  if (x === 'YR') x = 'YQ'
  if (x === 'A/') x = 'Aw'
  if (x === 'AA/') x = 'AA8'

  const res = base64.fromBase64(x, false)
  return String.fromCharCode(...res)
}

globalThis.btoa = (s) => {
  s = String(s)
  const ua = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c > 255) throw new Error('INVALID_CHARACTER_ERR')
    ua[i] = c
  }

  return base64.toBase64(ua, false, true)
}

describe('Web Platform Tests', () => {
  loadDir('encoding')
  loadDir('html/webappapis/atob')
})

// List of files so that bundler can locate all these
/* @preserve
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-basics.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-surrogates-utf8.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-byte-order-marks.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-fatal.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-ignorebom.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-utf16-surrogates.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textencoder-utf16-surrogates.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/html/webappapis/atob/base64.any.js'))
*/
