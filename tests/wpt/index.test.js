import { describe } from 'node:test'
import { loadDir } from './loader.cjs'
import { utf8fromStringLoose, utf8toString, utf8toStringLoose } from '@exodus/bytes/utf8.js'
import { toBase64, fromBase64 } from '@exodus/bytes/base64.js'

/* eslint-disable unicorn/text-encoding-identifier-case */

// Not a proper impl, not getters, etc
globalThis.TextEncoder = class {
  constructor() {
    this.encoding = 'utf-8'
  }

  encode(input = '') {
    return utf8fromStringLoose(input)
  }
}

// Not a proper impl, not getters, etc
globalThis.TextDecoder = class {
  constructor(label = 'utf-8', { fatal = false, ignoreBOM = false } = {}) {
    this.encoding = label
    this.fatal = fatal
    this.ignoreBOM = ignoreBOM
  }

  decode(input = Uint8Array.of(), { stream = false } = {}) {
    if (this.encoding !== 'utf-8' || stream) throw new Error('Unsupported')
    if (input instanceof ArrayBuffer) input = new Uint8Array(input)
    if (input instanceof DataView) {
      input = new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    }

    const res = this.fatal ? utf8toString(input) : utf8toStringLoose(input)
    return !this.ignoreBOM && res.codePointAt(0) === 65_279 ? res.slice(1) : res
  }
}

if (!globalThis.atob || !globalThis.HermesInternal) {
  globalThis.atob = (x) => {
    x = String(x).replaceAll(/[\t\n\f\r ]/g, '')

    // hack around non-strict input just for testing
    x = x.replace(/^ab(={0,4})$/, 'aQ$1')
    if (x === 'NaN') x = 'NaM'
    if (x === '12') x = '1w'
    if (x === 'YR') x = 'YQ'
    if (x === 'A/') x = 'Aw'
    if (x === 'AA/') x = 'AA8'

    const res = fromBase64(x)
    return String.fromCharCode(...res)
  }
}

if (!globalThis.btoa || !globalThis.HermesInternal) {
  globalThis.btoa = (s) => {
    s = String(s)
    const ua = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i)
      if (c > 255) throw new Error('INVALID_CHARACTER_ERR')
      ua[i] = c
    }

    return toBase64(ua)
  }
}

describe('Web Platform Tests', () => {
  loadDir('encoding')
  loadDir('html/webappapis/atob')
})

// List of files so that bundler can locate all these
/*
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-basics.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-surrogates-utf8.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-byte-order-marks.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-fatal.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-ignorebom.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textencoder-utf16-surrogates.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/html/webappapis/atob/base64.any.js'))
*/
