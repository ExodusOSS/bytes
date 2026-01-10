import { createMultibyteDecoder, createMultibyteEncoder } from '@exodus/bytes/multi-byte.js'
import { test, describe } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('multi-byte encodings are supersets of ascii', () => {
  // Except iso-2022-jp
  for (const encoding of ['big5', 'euc-kr', 'euc-jp', 'shift_jis', 'gbk', 'gb18030']) {
    test(encoding, (t) => {
      const decoder = createMultibyteDecoder(encoding)
      const encoder = createMultibyteEncoder(encoding)
      for (let i = 0; i < 128; i++) {
        let str
        try {
          str = decoder(Uint8Array.of(i))
        } catch (cause) {
          throw new Error(`Error decoding ${i} in ${encoding}`, { cause })
        }

        t.assert.strictEqual(str.length, 1, i)
        t.assert.strictEqual(str.codePointAt(0), i, i)

        t.assert.deepStrictEqual(encoder(str), Uint8Array.of(i))
      }
    })
  }
})

// https://encoding.spec.whatwg.org/#gb18030-encoder step 5
const gbExceptions = {
  E78D: Uint8Array.of(0xa6, 0xd9),
  E78E: Uint8Array.of(0xa6, 0xda),
  E78F: Uint8Array.of(0xa6, 0xdb),
  E790: Uint8Array.of(0xa6, 0xdc),
  E791: Uint8Array.of(0xa6, 0xdd),
  E792: Uint8Array.of(0xa6, 0xde),
  E793: Uint8Array.of(0xa6, 0xdf),
  E794: Uint8Array.of(0xa6, 0xec),
  E795: Uint8Array.of(0xa6, 0xed),
  E796: Uint8Array.of(0xa6, 0xf3),
  E81E: Uint8Array.of(0xfe, 0x59),
  E826: Uint8Array.of(0xfe, 0x61),
  E82B: Uint8Array.of(0xfe, 0x66),
  E82C: Uint8Array.of(0xfe, 0x67),
  E832: Uint8Array.of(0xfe, 0x6d),
  E843: Uint8Array.of(0xfe, 0x7e),
  E854: Uint8Array.of(0xfe, 0x90),
  E864: Uint8Array.of(0xfe, 0xa0),
}

describe('specific tests', () => {
  test('big5', (t) => {
    const enc = createMultibyteEncoder('big5')
    const dec = createMultibyteDecoder('big5')

    // https://encoding.spec.whatwg.org/#index-big5-pointer
    // If codePoint is U+2550 (═), U+255E (╞), U+2561 (╡), U+256A (╪), U+5341 (十), or U+5345 (卅),
    // then return the last pointer corresponding to codePoint in index.

    t.assert.strictEqual(dec(Uint8Array.of(0xa2, 0xa4)), String.fromCodePoint(0x25_50)) // 5247
    t.assert.strictEqual(dec(Uint8Array.of(0xf9, 0xf9)), String.fromCodePoint(0x25_50)) // 18991
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x25_50)), Uint8Array.of(0xf9, 0xf9)) // 18991

    t.assert.strictEqual(dec(Uint8Array.of(0xa2, 0xa5)), String.fromCodePoint(0x25_5e)) // 5248
    t.assert.strictEqual(dec(Uint8Array.of(0xf9, 0xe9)), String.fromCodePoint(0x25_5e)) // 18975
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x25_5e)), Uint8Array.of(0xf9, 0xe9)) // 18975

    t.assert.strictEqual(dec(Uint8Array.of(0xa2, 0xa7)), String.fromCodePoint(0x25_61)) // 5250
    t.assert.strictEqual(dec(Uint8Array.of(0xf9, 0xeb)), String.fromCodePoint(0x25_61)) // 18977
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x25_61)), Uint8Array.of(0xf9, 0xeb)) // 18977

    t.assert.strictEqual(dec(Uint8Array.of(0xa2, 0xa6)), String.fromCodePoint(0x25_6a)) // 5249
    t.assert.strictEqual(dec(Uint8Array.of(0xf9, 0xea)), String.fromCodePoint(0x25_6a)) // 18976
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x25_6a)), Uint8Array.of(0xf9, 0xea)) // 18976

    t.assert.strictEqual(dec(Uint8Array.of(0xa2, 0xcc)), String.fromCodePoint(0x53_41)) // 5287
    t.assert.strictEqual(dec(Uint8Array.of(0xa4, 0x51)), String.fromCodePoint(0x53_41)) // 5512
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x53_41)), Uint8Array.of(0xa4, 0x51)) // 5512

    t.assert.strictEqual(dec(Uint8Array.of(0xa2, 0xce)), String.fromCodePoint(0x53_45)) // 5289
    t.assert.strictEqual(dec(Uint8Array.of(0xa4, 0xca)), String.fromCodePoint(0x53_45)) // 5599
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x53_45)), Uint8Array.of(0xa4, 0xca)) // 5599

    // But not others, which return first codepoint in index
    t.assert.strictEqual(dec(Uint8Array.of(0xa1, 0xb2)), String.fromCodePoint(0x30_03)) // 5104
    t.assert.strictEqual(dec(Uint8Array.of(0xc6, 0xde)), String.fromCodePoint(0x30_03)) // 10957
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x30_03)), Uint8Array.of(0xa1, 0xb2)) // 5104

    t.assert.strictEqual(dec(Uint8Array.of(0xa2, 0xcd)), String.fromCodePoint(0x53_44)) // 5288
    t.assert.strictEqual(dec(Uint8Array.of(0xfa, 0xc5)), String.fromCodePoint(0x53_44)) // 19096
    t.assert.deepStrictEqual(enc(String.fromCodePoint(0x53_44)), Uint8Array.of(0xa2, 0xcd)) // 5288
  })

  test('shift_jis', (t) => {
    const enc = createMultibyteEncoder('shift_jis')
    const dec = createMultibyteDecoder('shift_jis')

    // https://encoding.spec.whatwg.org/#shift_jis-encoder
    t.assert.deepStrictEqual(enc('\u007F'), Uint8Array.of(0x7f))
    t.assert.deepStrictEqual(enc('\u0080'), Uint8Array.of(0x80)) // If codePoint is an ASCII code point or U+0080, then return a byte whose value is codePoint.
    t.assert.deepStrictEqual(enc('\u00A5'), Uint8Array.of(0x5c)) // If codePoint is U+00A5 (¥), then return byte 0x5C.
    t.assert.deepStrictEqual(enc('\u203E'), Uint8Array.of(0x7e)) // If codePoint is U+203E (‾), then return byte 0x7E.
    t.assert.deepStrictEqual(enc('\u2212'), enc('\uFF0D')) // If codePoint is U+2212 (−), then set it to U+FF0D (－).
    t.assert.strictEqual(dec(enc('\uFF0D')), '\uFF0D')
    t.assert.strictEqual(dec(enc('\u2212')), '\uFF0D')

    for (let i = 0xff_61; i <= 0xff_9f; i++) {
      const str = String.fromCodePoint(i)
      t.assert.deepStrictEqual(enc(str), Uint8Array.of(i - 0xff_61 + 0xa1))
      t.assert.strictEqual(dec(enc(str)), str)
    }
  })

  test('euc-jp', (t) => {
    const enc = createMultibyteEncoder('euc-jp')
    const dec = createMultibyteDecoder('euc-jp')

    // https://encoding.spec.whatwg.org/#euc-jp-encoder
    t.assert.deepStrictEqual(enc('\u007F'), Uint8Array.of(0x7f))
    t.assert.throws(() => enc('\u0080'))
    t.assert.deepStrictEqual(enc('\u00A5'), Uint8Array.of(0x5c)) // If codePoint is U+00A5 (¥), then return byte 0x5C.
    t.assert.deepStrictEqual(enc('\u203E'), Uint8Array.of(0x7e)) // If codePoint is U+203E (‾), then return byte 0x7E.
    t.assert.deepStrictEqual(enc('\u2212'), enc('\uFF0D')) // If codePoint is U+2212 (−), then set it to U+FF0D (－).
    t.assert.strictEqual(dec(enc('\uFF0D')), '\uFF0D')
    t.assert.strictEqual(dec(enc('\u2212')), '\uFF0D')
    for (let i = 0xff_61; i <= 0xff_9f; i++) {
      const str = String.fromCodePoint(i)
      t.assert.deepStrictEqual(enc(str), Uint8Array.of(0x8e, i - 0xff_61 + 0xa1))
      t.assert.strictEqual(dec(enc(str)), str)
    }
  })

  test('euc-kr', (t) => {
    const enc = createMultibyteEncoder('euc-kr')

    // https://encoding.spec.whatwg.org/#euc-kr-encoder
    t.assert.deepStrictEqual(enc('\u007F'), Uint8Array.of(0x7f))
    t.assert.throws(() => enc('\u0080'))
  })

  test('gb18030, gbk', (t) => {
    // gb18030 can encode replacement
    t.assert.throws(() => createMultibyteEncoder('gbk')('\uFFFD')) // gbk can't encode it
    const rep = createMultibyteEncoder('gb18030')('\uFFFD')
    t.assert.strictEqual(createMultibyteDecoder('gb18030')(rep), '\uFFFD')
    t.assert.deepStrictEqual(rep, Uint8Array.of(0x84, 0x31, 0xa4, 0x37)) // pointer 39417, valid representation for the replacement char

    // https://encoding.spec.whatwg.org/#gb18030-encoder
    // 3. If codePoint is U+E5E5, then return error with codePoint.
    t.assert.throws(() => createMultibyteEncoder('gbk')('\uE5E5')) // not present in index so doesn't need special handling
    t.assert.throws(() => createMultibyteEncoder('gb18030')('\uE5E5')) // excluded from ranges via a specific check

    // gbk and gb18030 encode U+20AC differently, but decode both variants
    // https://encoding.spec.whatwg.org/#gb18030-encoder
    // 4. If is GBK is true and codePoint is U+20AC (€), then return byte 0x80.
    t.assert.deepStrictEqual(createMultibyteEncoder('gb18030')('\u20AC'), Uint8Array.of(0xa2, 0xe3))
    t.assert.deepStrictEqual(createMultibyteEncoder('gbk')('\u20AC'), Uint8Array.of(0x80))
    t.assert.strictEqual(createMultibyteDecoder('gb18030')(Uint8Array.of(0xa2, 0xe3)), '\u20AC')
    t.assert.strictEqual(createMultibyteDecoder('gb18030')(Uint8Array.of(0x80)), '\u20AC')
    t.assert.strictEqual(createMultibyteDecoder('gbk')(Uint8Array.of(0xa2, 0xe3)), '\u20AC')
    t.assert.strictEqual(createMultibyteDecoder('gbk')(Uint8Array.of(0x80)), '\u20AC')

    for (const encoding of ['gb18030', 'gbk']) {
      const enc = createMultibyteEncoder(encoding)
      for (const [hex, u8] of Object.entries(gbExceptions)) {
        t.assert.doesNotThrow(
          () => t.assert.deepStrictEqual(enc(String.fromCodePoint(parseInt(hex, 16))), u8),
          `${encoding}(U+${hex})`
        )
      }
    }
  })
})

function loadTable(encoding, t) {
  const text = readFileSync(
    join(import.meta.dirname, 'encoding/fixtures/multi-byte', `index-${encoding}.txt`),
    'utf8'
  )

  const rows = text
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x && x[0] !== '#')
    .map((x) => x.split('\t'))
    .map(([istr, codeHex, description]) => {
      const i = Number(istr)
      const code = parseInt(codeHex.slice(2), 16)
      t.assert.strictEqual(`${i}`, istr)
      t.assert.strictEqual('0x' + code.toString(16).padStart(4, '0').toUpperCase(), codeHex)
      return { i, code, description }
    })

  t.assert.strictEqual(rows.length, new Set(rows.map((row) => row.i)).size) // all unique
  return rows
}

describe('roundtrip, tables', () => {
  const encodings = {
    big5: 'big5',
    shift_jis: 'jis0208',
    'euc-jp': 'jis0208',
    'euc-kr': 'euc-kr',
    gbk: 'gb18030',
    gb18030: 'gb18030',
  }

  for (const [encoding, tableID] of Object.entries(encodings)) {
    test(encoding, (t) => {
      const enc = createMultibyteEncoder(encoding)
      const dec = createMultibyteDecoder(encoding)
      const table = loadTable(tableID, t)
      const last = new Map(table.map(({ i, code }) => [code, i]))
      for (const { i, code, description } of table) {
        const str = String.fromCodePoint(code)

        // https://encoding.spec.whatwg.org/#index-big5-pointer excludes low pointers
        if (encoding === 'big5' && i < (0xa1 - 0x81) * 157) {
          // If last seen with that code is in low pointer range, it should throw
          if (last.get(code) === i) t.assert.throws(() => enc(str), description)
          continue
        }

        t.assert.doesNotThrow(() => t.assert.strictEqual(dec(enc(str)), str), description)
      }
    })
  }
})

describe('roundtrip, full Unicode', () => {
  const MAX = 0x10_ff_ff // Max Unicode codepoint

  test('gb18030', { timeout: 60_000 }, (t) => {
    const enc = createMultibyteEncoder('gb18030')
    const dec = createMultibyteDecoder('gb18030')

    for (let i = 0; i <= MAX; i++) {
      const s = String.fromCodePoint(i)
      const id = `U+${i.toString(16).toUpperCase()}`
      if (i >= 0xd8_00 && i <= 0xdf_ff) {
        // Surrogates
        t.assert.throws(() => enc(s), `Surrogate ${id}`)
        continue
      }

      // https://encoding.spec.whatwg.org/#gb18030-encoder step 3. If codePoint is U+E5E5, then return error with codePoint.
      if (i === 0xe5_e5) {
        t.assert.throws(() => enc(s), id)
        continue
      }

      let u8
      t.assert.doesNotThrow(() => {
        u8 = enc(s)
      }, id)

      if (Object.hasOwn(gbExceptions, i.toString(16).toUpperCase())) {
        t.assert.deepStrictEqual(u8, gbExceptions[i.toString(16).toUpperCase()], id)
      } else {
        t.assert.strictEqual(dec(u8), s, id)
      }
    }
  })
})
