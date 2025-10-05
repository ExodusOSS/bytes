import { describe } from 'node:test'
import { loadDir } from './loader.cjs'
import * as js from '../../fallback/utf8.js'

/* eslint-disable unicorn/text-encoding-identifier-case */

// Not a proper impl, not getters, etc
globalThis.TextEncoder = class {
  constructor() {
    this.encoding = 'utf-8'
  }

  encode(input = '') {
    return js.encode(input, true)
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
    if (input instanceof DataView)
      input = new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    const res = js.decode(input, !this.fatal)
    return !this.ignoreBOM && res.codePointAt(0) === 65_279 ? res.slice(1) : res
  }
}

describe('Web Platform Tests', () => {
  loadDir('encoding')
})

// List of files so that bundler can locate all these
/*
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-basics.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-surrogates-utf8.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-byte-order-marks.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-fatal.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-ignorebom.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textencoder-utf16-surrogates.any.js'))
*/
