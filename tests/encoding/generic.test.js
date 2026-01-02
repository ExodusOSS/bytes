import {
  TextDecoder,
  TextEncoder,
  getBOMEncoding,
  legacyHookDecode,
} from '@exodus/bytes/encoding.js'
import { fromHex } from '@exodus/bytes/hex.js'
import { test, describe } from 'node:test'
import { labels } from './fixtures/encodings.cjs'
import unfinishedBytesFixtures from './fixtures/unfinishedBytes.js'

test('Unfinished bytes', (t) => {
  for (const [encoding, trail, u8] of unfinishedBytesFixtures) {
    const decoder = new TextDecoder(encoding)
    const a0 = decoder.decode(u8, { stream: true })
    const b0 = decoder.decode()
    const ab = new TextDecoder(encoding).decode(u8)
    const a1 = new TextDecoder(encoding).decode(u8.subarray(0, u8.length - trail))
    const b1 = new TextDecoder(encoding).decode(u8.subarray(u8.length - trail))
    t.assert.strictEqual(a0, a1)
    t.assert.strictEqual(b0, b1)
    t.assert.strictEqual(a0 + b0, ab)
    t.assert.strictEqual(decoder.decode(u8), ab) // reuse

    if (trail === 0) {
      t.assert.strictEqual(a0, ab)
      t.assert.strictEqual(b0, '')
    }

    if (trail === u8.length) {
      t.assert.strictEqual(a0, '')
      t.assert.strictEqual(b0, ab)
    }
  }
})

test('String coercion', (t) => {
  const encoder = new TextEncoder()
  const map = [
    [{}, '[object Object]'],
    [null, 'null'],
    [undefined, 'undefined'],
  ]

  for (const [arg, string] of map) {
    const length = string.length
    const a = encoder.encode(string)
    t.assert.strictEqual(a.length, length)

    const b = encoder.encode(arg)
    if (arg === undefined) {
      // undefined is special
      t.assert.strictEqual(b.length, 0)
      t.assert.deepStrictEqual(b, Uint8Array.of())
    } else {
      const b = encoder.encode(arg)
      t.assert.strictEqual(b.length, length)
      t.assert.deepStrictEqual(b, a)
    }

    const c = new Uint8Array(20)
    t.assert.deepStrictEqual(encoder.encodeInto(arg, c), { read: length, written: length })
    t.assert.deepStrictEqual(c.subarray(0, length), a)
  }
})

// https://encoding.spec.whatwg.org/#x-user-defined-decoder
test('x-user-defined encoding', (t) => {
  const decoder = new TextDecoder('x-user-defined')
  for (let byte = 0; byte < 256; byte++) {
    const codePoint = byte >= 128 ? 0xf7_80 + byte - 0x80 : byte
    t.assert.strictEqual(decoder.decode(Uint8Array.of(byte)), String.fromCodePoint(codePoint))
  }
})

// iso-8859-1, iso-8859-9, iso-8859-11 differ in WHATWG Encoding spec from https://unicode.org/Public/MAPPINGS/ISO8859
// and map to windows-1252, windows-1254, windows-874 instead
test('not all ISO-8859 encodings are present in TextDecoder', (t) => {
  t.assert.strictEqual(new TextDecoder('iso-8859-1').encoding, 'windows-1252')
  t.assert.strictEqual(new TextDecoder('iso-8859-2').encoding, 'iso-8859-2') // present
  t.assert.strictEqual(new TextDecoder('iso-8859-9').encoding, 'windows-1254')
  t.assert.strictEqual(new TextDecoder('iso-8859-11').encoding, 'windows-874')
  t.assert.throws(() => new TextDecoder('iso-8859-12'))
  t.assert.strictEqual(new TextDecoder('iso-8859-13').encoding, 'iso-8859-13') // present
})

describe('encodings are ASCII supersets, except utf-16 and iso-2022-jp', () => {
  for (const label of labels) {
    if (label === 'replacement' || label === 'utf-16le' || label === 'utf-16be') continue
    test(label, (t) => {
      const loose = new TextDecoder(label)
      const fatal = new TextDecoder(label, { fatal: true })
      for (let i = 0; i < 128; i++) {
        if (label === 'iso-2022-jp' && [0x0e, 0x0f, 0x1b].includes(i)) continue
        t.assert.strictEqual(loose.decode(Uint8Array.of(i)), String.fromCodePoint(i))
        t.assert.strictEqual(fatal.decode(Uint8Array.of(i)), String.fromCodePoint(i))
      }
    })
  }
})

describe('legacyHookDecode', () => {
  const fixtures = {
    replacement: [
      ['', ''],
      ['00', '\uFFFD'],
      ['ff', '\uFFFD'],
      ['20', '\uFFFD'],
      ['2020', '\uFFFD'],
      // BOM takes preference
      ['efbbbf', ''],
      ['efbbbf2a', '*'],
      ['efbbbf202a', ' *'],
      ['fffe', ''],
      ['fffe2a20', '\u202A'],
      ['fffe2a', '\uFFFD'],
      ['fffe00d72a', '\uD700\uFFFD'],
      ['fffe00d82a', '\uFFFD'],
      ['fffe00dc2a', '\uFFFD\uFFFD'],
      ['feff', ''],
      ['feff202a', '\u202A'],
      ['feff20', '\uFFFD'],
      ['feffd70020', '\uD700\uFFFD'],
      ['feffd80020', '\uFFFD'],
      ['feffdc0020', '\uFFFD\uFFFD'],
    ],
    // non-normalized names
    Utf8: [['c280', '\x80']],
    unicodefeff: [['c280', '\u80C2']],
    UnicodeFFFE: [['c280', '\uC280']],
  }

  test('null encoding', (t) => {
    t.assert.throws(() => legacyHookDecode(Uint8Array.of(), null), RangeError)
  })

  for (const [encoding, data] of Object.entries(fixtures)) {
    test(encoding, (t) => {
      for (const [hex, string] of data) {
        t.assert.strictEqual(legacyHookDecode(fromHex(hex), encoding), string, `${hex}`)
      }
    })
  }
})

test('getBOMEncoding', (t) => {
  const fixtures = [
    [null, ''],
    [null, 'ff'],
    [null, 'fe'],
    [null, 'ef'],
    [null, 'efbb'],
    [null, 'efbb00'],
    [null, 'efbfbb'],
    [null, 'ffbbbf'],
    ['utf-8', 'efbbbf'],
    ['utf-8', 'efbbbf00'],
    ['utf-16le', 'fffe'],
    ['utf-16le', 'fffefffe'],
    ['utf-16le', 'fffefffefffe'],
    ['utf-16le', 'fffebb'],
    ['utf-16le', 'fffebf'],
    ['utf-16be', 'feff'],
    ['utf-16be', 'fefffeff'],
    ['utf-16be', 'fefffefffeff'],
  ]

  for (const [enc, hex] of fixtures) {
    t.assert.strictEqual(getBOMEncoding(fromHex(hex)), enc, `${hex} -> ${enc}`)
  }
})

describe('BOM handling', () => {
  const fixtures = [
    ['utf-16le', 'fffe', ''],
    ['utf-16le', 'fffefffe', '\uFEFF'],
    ['utf-16le', 'fffefffefffe', '\uFEFF\uFEFF'],
    ['utf-16le', 'feff', '\uFFFE'],
    ['utf-16le', 'fefffeff', '\uFFFE\uFFFE'],
    ['utf-16le', 'fefffefffeff', '\uFFFE\uFFFE\uFFFE'],

    ['utf-16be', 'feff', ''],
    ['utf-16be', 'fefffeff', '\uFEFF'],
    ['utf-16be', 'fefffefffeff', '\uFEFF\uFEFF'],
    ['utf-16be', 'fffe', '\uFFFE'],
    ['utf-16be', 'fffefffe', '\uFFFE\uFFFE'],
    ['utf-16be', 'fffefffefffe', '\uFFFE\uFFFE\uFFFE'],
  ]

  test('fixtures', (t) => {
    for (const [enc, hex, string] of fixtures) {
      const res = new TextDecoder(enc).decode(fromHex(hex))
      t.assert.strictEqual(res.length, string.length, `${enc}(${hex}).length`)
      t.assert.strictEqual(res, string, `${enc}(${hex})`)
    }
  })

  test('stateless', (t) => {
    let decoder
    for (const [enc, hex, string] of fixtures) {
      if (!decoder || decoder.encoding !== enc) decoder = new TextDecoder(enc)
      const res = decoder.decode(fromHex(hex))
      t.assert.strictEqual(res.length, string.length, `${enc}(${hex}).length`)
      t.assert.strictEqual(res, string, `${enc}(${hex})`)
    }
  })

  // https://bugzilla.mozilla.org/show_bug.cgi?id=2005419
  test('throwing clears state', (t) => {
    for (const [enc, hex, string] of fixtures) {
      for (const prefix of ['ff', 'ffff', 'ffffff']) {
        const decoder = new TextDecoder(enc, { fatal: true })
        try {
          decoder.decode(fromHex(prefix))
        } catch {}

        const res = decoder.decode(fromHex(hex))
        t.assert.strictEqual(res.length, string.length, `${enc}(${hex}).length, prefix=${prefix}`)
        t.assert.strictEqual(res, string, `${enc}(${hex}), prefix=${prefix}`)
      }
    }
  })
})

test('euc-kr encoding', (t) => {
  t.assert.throws(() => new TextDecoder('euc-kr', { fatal: true }).decode(Uint8Array.of(0x80)))
  t.assert.strictEqual(new TextDecoder('euc-kr').decode(Uint8Array.of(0x80)), '\uFFFD')

  // TODO: more tests
})

test('big5 encoding', (t) => {
  t.assert.throws(() => new TextDecoder('big5', { fatal: true }).decode(Uint8Array.of(0x80)))
  t.assert.strictEqual(new TextDecoder('big5').decode(Uint8Array.of(0x80)), '\uFFFD')

  const loose = new TextDecoder('big5')
  t.assert.strictEqual(loose.decode(Uint8Array.of(0x83, 0x5c)), String.fromCodePoint(0xff_fd, 0x5c)) // https://github.com/nodejs/node/issues/40091

  // TODO: more tests
})

// TODO: test more encodings
