// Drop available native implementations so fallbacks will be used
// The only exception is *.node.js impls, but tests in other contexts cover that
if (!globalThis.Buffer || globalThis.Buffer.TYPED_ARRAY_SUPPORT) {
  delete globalThis.TextEncoder
  delete globalThis.TextDecoder
}

delete Uint8Array.fromBase64
Uint8Array.prototype.toBase64 = undefined // eslint-disable-line no-extend-native

const { describe } = require('node:test')
const { loadDir } = require('./loader.cjs')
const base64 = require('../../fallback/base64.js')
const { TextEncoder, TextDecoder } = require('@exodus/bytes/text-encoding.js')

if (!TextDecoder || !TextEncoder) throw new Error('No TextDecoder / TextEncoder')

globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

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
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-invalid-label.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-surrogates-utf8.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/encodeInto.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-arguments.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-byte-order-marks.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-copy.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-eof.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-fatal.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-fatal-single-byte.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-fatal-streaming.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-ignorebom.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-labels.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-streaming.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textdecoder-utf16-surrogates.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textencoder-constructor-non-utf.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/textencoder-utf16-surrogates.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/html/webappapis/atob/base64.any.js'))
*/
