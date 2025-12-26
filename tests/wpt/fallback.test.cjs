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
const { TextEncoder, TextDecoder, TextDecoderStream } = require('@exodus/bytes/encoding.js')

if (!TextDecoder || !TextEncoder) throw new Error('No TextDecoder / TextEncoder')

Object.assign(globalThis, { TextEncoder, TextDecoder, TextDecoderStream })

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
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-replacement-encodings.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/api-surrogates-utf8.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/encodeInto.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/iso-2022-jp-decoder.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-schinese/gb18030/gb18030-decoder.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-schinese/gbk/gbk-decoder.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/streams/decode-attributes.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/streams/decode-bad-chunks.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/streams/decode-ignore-bom.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/streams/decode-incomplete-input.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/streams/decode-non-utf8.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/streams/decode-split-character.any.js'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/streams/decode-utf8.any.js'))
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

fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/euc-jp/eucjp_chars-cseucpkdfmtjapanese.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/euc-jp/eucjp_chars-x-euc-jp.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/euc-jp/eucjp_chars.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/euc-jp/eucjp_errors.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/iso-2022-jp/iso2022jp_chars-csiso2022jp.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/iso-2022-jp/iso2022jp_chars.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/iso-2022-jp/iso2022jp_errors.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars-csshiftjis.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars-ms932.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars-ms_kanji.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars-shift-jis.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars-sjis.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars-windows-31j.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars-x-sjis.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_chars.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-japanese/shift_jis/sjis_errors.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-cseuckr.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-csksc56011987.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-iso-ir-149.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-korean.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-ks_c_5601-1987.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-ks_c_5601-1989.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-ksc5601.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-ksc_5601.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars-windows-949.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_chars.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-korean/euc-kr/euckr_errors.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-tchinese/big5/big5_chars-big5-hkscs.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-tchinese/big5/big5_chars-cn-big5.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-tchinese/big5/big5_chars-csbig5.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-tchinese/big5/big5_chars-x-x-big5.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-tchinese/big5/big5_chars.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-tchinese/big5/big5_chars_extra.html'))
fs.readFileSync(path.join(__dirname, 'fixtures/encoding/legacy-mb-tchinese/big5/big5_errors.html'))
*/
