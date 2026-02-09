import '@exodus/bytes/encoding.js'
import { percentEncodeAfterEncoding } from '@exodus/bytes/whatwg.js'
import { keccakprg } from '@noble/hashes/sha3-addons.js'
import { describe, test, before, after } from 'node:test'
import { labels } from './encoding/fixtures/encodings.cjs'

// The test uses https:// URL query, which is special
const specialquery = ' "#\'<>' // https://url.spec.whatwg.org/#special-query-percent-encode-set

const invalid = new Set(['replacement', 'utf-16le', 'utf-16be']) // https://encoding.spec.whatwg.org/#get-an-encoder

const { window, document } = globalThis

const range = (length, start) => Array.from({ length }, (_, i) => String.fromCodePoint(start + i))
const strings = [
  ...range(256, 0x20).filter((x) => x !== ' ' && x !== '#'), // we directly set to href
  ...range(256, 0)
    .filter((x) => x !== '#' && x !== '\t' && x !== '\n' && x !== '\r')
    .map((x) => `${x}*`),
  ...range(256, 0)
    .filter((x) => x !== '#' && x !== '\t' && x !== '\n' && x !== '\r')
    .map((x) => `*${x}*`),

  String.fromCodePoint(0xfe_ff),
  String.fromCodePoint(0xff_fd),
  String.fromCodePoint(0xff_fe),
  String.fromCodePoint(0xff_ff),
  String.fromCodePoint(0x1_00_00),
  String.fromCodePoint(0x2_f8_a6), // max big5
  String.fromCodePoint(0x2_f8_a7),
  String.fromCodePoint(0x1_10_00),

  String.fromCodePoint(42, 0x1_00_00, 0x1_10_00, 42),
  String.fromCodePoint(42, 0x1_00_00, 44, 0x1_10_00, 42),
  String.fromCodePoint(42, 0x1_00_00, 0x1_10_00, 42),
  String.fromCodePoint(42, 0x1_00_00, 44, 0x1_10_00, 42),

  String.fromCharCode(0x20, 0x22, 0x3c, 0x3e, 0x60),
  String.fromCharCode(0x20, 0x22, 0x24, 0x3c, 0x3e),
  String.fromCharCode(0x3f, 0x5e, 0x60, 0x7b, 0x7d),
  String.fromCharCode(0x2f, 0x3a, 0x3b, 0x3d, 0x40, 0x5b, 0x5c, 0x5d, 0x7c),
  String.fromCharCode(0x24, 0x25, 0x26, 0x2b, 0x2c),
  String.fromCharCode(0x21, 0x27, 0x28, 0x29, 0x7e),

  String.fromCharCode(0x61, 0x62, 0xd8_00, 0x77, 0x78),
  String.fromCharCode(0xd8_00, 0xd8_00),
  String.fromCharCode(0x61, 0x62, 0xdf_ff, 0x77, 0x78),
  String.fromCharCode(0xdf_ff, 0xd8_00),

  range(0x2_00, 0x24).join(''), // from # + 1
  range(0x2_00, 0xf6_00).join(''), // user-defined
  range(0x2_00, 0xff_00).join(''),
  range(0x20_00, 0x24).join(''),
  range(0x20_00, 0xf0_00).join(''),
  range(0x20_00, 0xf_f0_00).join(''),
  'hello' + range(0x20_00, 0xf0_00).join('') + 'abc',
]

const fixedPRG = keccakprg() // We don't add any entropy, so it spills out predicatable results
for (let i = 1; i <= 32; i++) {
  const u8 = fixedPRG.randomBytes(1024)
  const u16 = new Uint16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2)
  const u32 = new Uint32Array(u8.buffer, u8.byteOffset, u8.byteLength / 4)
  const chunk = [
    String.fromCharCode.apply(String, u8),
    String.fromCharCode.apply(String, u16),
    String.fromCodePoint(...u32.map((x) => x % 0x11_00_00)),
  ].map(
    (x) =>
      x
        .trim()
        .replaceAll(/[\t\n\r#]/g, '')
        .replaceAll(/[\x00-\x20]+$/g, '') // eslint-disable-line no-control-regex
  )
  strings.push(...chunk)
}

// Passes on Chromium, Firefox, Servo. Webkit is incorrect
const skip = !document || !window || process.env.EXODUS_TEST_PLATFORM === 'webkit'

describe('percent-encode after encoding matches browser', { skip }, () => {
  let handle
  const onmessage = (event) => handle(event.data)
  const iframe = document.createElement('iframe')

  before(() => {
    window.addEventListener('message', onmessage)
    document.body.append(iframe)
  })

  after(() => {
    window.removeEventListener('message', onmessage)
    iframe.remove()
  })

  for (const encoding of labels) {
    if (invalid.has(encoding)) continue
    test(encoding, { timeout: 60_000 }, async (t) => {
      let ok = 0
      const loaded = new Promise((resolve) => (handle = resolve))
      const html = `
        <!DOCTYPE html>
        <script>
        var a = document.createElement('a');
        window.parent.postMessage('', '*');
        window.addEventListener('message', (e) => {
          a.href = 'https://example.com/?' + e.data
          window.parent.postMessage(a.search.slice(1), '*')
        })
        </script>`
      iframe.src = `data:text/html;charset=${encoding},${encodeURI(html)}`
      await loaded

      for (const str of strings) {
        const promise = new Promise((resolve) => (handle = resolve))
        iframe.contentWindow.postMessage(str, '*')
        const actual = percentEncodeAfterEncoding(encoding, str, specialquery)
        t.assert.strictEqual(actual, await promise, `${encoding} #${ok + 1}`)
        ok++
      }

      t.assert.strictEqual(ok, strings.length)
    })
  }
})

const skipLarge = process.env.EXODUS_TEST_PLATFORM === 'engine262'

// Ensures that behavior mathches everywhere with snapshots
// Combined with the above check, we know that snapshots match reference browser platforms
describe('percent-encode after encoding matches snapshot', { skip: skipLarge }, () => {
  for (const encoding of labels) {
    if (invalid.has(encoding)) continue
    test(encoding, async (t) => {
      const res = []
      for (const str of strings) res.push(percentEncodeAfterEncoding(encoding, str, specialquery))
      if (t.assert.snapshot) {
        t.assert.snapshot(res)
      } else {
        t.skip('Snapshots are not supported')
      }
    })
  }
})
