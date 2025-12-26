// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/encoding.js'

import { test, describe } from 'node:test'

const u = (...args) => Uint8Array.of(...args)

describe('Common implementation mistakes', () => {
  describe('Unicode', () => {
    describe('Invalid input is replaced', () => {
      const invalid8 = [
        { bytes: [0, 254, 255], charcodes: [0, 0xff_fd, 0xff_fd] },
        { bytes: [0x80], charcodes: [0xff_fd] },
        { bytes: [0xf0, 0x90, 0x80], charcodes: [0xff_fd] }, // https://npmjs.com/package/buffer is wrong
        { bytes: [0xf0, 0x80, 0x80], charcodes: [0xff_fd, 0xff_fd, 0xff_fd] }, // https://github.com/nodejs/node/issues/16894
      ]

      const invalid16 = [
        { invalid: [0x61, 0x62, 0xd8_00, 0x77, 0x78], replaced: [0x61, 0x62, 0xff_fd, 0x77, 0x78] },
        { invalid: [0xd8_00], replaced: [0xff_fd] },
        { invalid: [0xd8_00, 0xd8_00], replaced: [0xff_fd, 0xff_fd] },
        { invalid: [0x61, 0x62, 0xdf_ff, 0x77, 0x78], replaced: [0x61, 0x62, 0xff_fd, 0x77, 0x78] },
        { invalid: [0xdf_ff, 0xd8_00], replaced: [0xff_fd, 0xff_fd] },
      ]

      // https://npmjs.com/package/buffer is wrong on this
      // which means that iconv-lite and whatwg-encoding are wrong on non-Node.js environments
      // this test fails on whatwg-encoding in browsers
      test('utf-8', (t) => {
        const d = new TextDecoder()
        for (const { bytes, charcodes } of invalid8) {
          t.assert.strictEqual(d.decode(Uint8Array.from(bytes)), String.fromCharCode(...charcodes))
        }
      })

      // whatwg-encoding, iconv-lite, and any other implementations just using Buffer fail on this
      test('utf-16le', (t) => {
        const d = new TextDecoder('utf-16le')
        for (const { invalid, replaced } of invalid16) {
          const input = new Uint8Array(invalid.length * 2)
          for (let i = 0; i < invalid.length; i++) {
            input[2 * i] = invalid[i] & 0xff
            input[2 * i + 1] = invalid[i] >> 8
          }

          t.assert.strictEqual(d.decode(input), String.fromCharCode(...replaced))
        }
      })

      // whatwg-encoding, iconv-lite, and any other implementations just using Buffer fail on this
      test('utf-16be', (t) => {
        const d = new TextDecoder('utf-16be')
        for (const { invalid, replaced } of invalid16) {
          const input = new Uint8Array(invalid.length * 2)
          for (let i = 0; i < invalid.length; i++) {
            input[2 * i] = invalid[i] >> 8
            input[2 * i + 1] = invalid[i] & 0xff
          }

          t.assert.strictEqual(d.decode(input), String.fromCharCode(...replaced))
        }
      })
    })
  })

  describe('ASCII', () => {
    // Node.js fails on this
    // https://github.com/nodejs/node/issues/40091#issuecomment-3633854200
    describe('Single-byte encodings are ASCII supersets', () => {
      for (const fatal of [false, true]) {
        describe(fatal ? 'fatal' : 'loose', () => {
          for (const encoding of ['windows-1252', 'ibm866']) {
            test(encoding, (t) => {
              const d = new TextDecoder(encoding, { fatal })
              for (const b of [0x00, 0x1a, 0x1c, 0x42, 0x7f]) {
                t.assert.strictEqual(d.decode(u(b)), String.fromCharCode(b), `Byte: ${b}`)
              }
            })
          }
        })
      }
    })

    // Node.js fails on this
    // https://github.com/nodejs/node/issues/40091#issuecomment-3633854200
    describe('Most legacy multi-byte encodings are ASCII supersets', () => {
      for (const fatal of [false, true]) {
        describe(fatal ? 'fatal' : 'loose', () => {
          for (const encoding of ['gbk', 'gb18030', 'big5', 'euc-jp', 'shift_jis', 'euc-kr']) {
            test(encoding, (t) => {
              const d = new TextDecoder(encoding, { fatal })
              for (const b of [0x00, 0x1a, 0x1c, 0x42, 0x7f]) {
                t.assert.strictEqual(d.decode(u(b)), String.fromCharCode(b), `Byte: ${b}`)
              }
            })
          }
        })
      }
    })
  })

  // Chrome breaks on this
  // https://issues.chromium.org/issues/468458388
  describe('fast path misdetection', () => {
    for (const fatal of [false, true]) {
      describe(fatal ? 'fatal' : 'loose', () => {
        const windows = [874, 1250, 1252, 1253, 1254, 1255, 1257, 1258].map((x) => `windows-${x}`) // these have \x80 mapped to euro sign
        for (const encoding of [...windows, 'latin1', 'ascii']) {
          test(encoding, (t) => {
            const d = new TextDecoder(encoding, { fatal })
            for (let i = 1; i <= 33; i++) {
              const u8 = new Uint8Array(i)
              u8[i - 1] = 0x80
              t.assert.strictEqual(d.decode(u8)[i - 1], '€')
            }
          })
        }
      })
    }
  })

  describe('specific encodings', () => {
    describe('utf-16le', () => {
      // https://github.com/facebook/hermes/pull/1855#issuecomment-3639872455
      test('does not produce more chars than truncated', (t) => {
        const d = new TextDecoder('utf-16le')
        t.assert.strictEqual(d.decode(u(0, 0, 0)), '\0\uFFFD') // two character, 0 was valid
        t.assert.strictEqual(d.decode(u(42, 0, 0)), '*\uFFFD') // two characters, * was valid
        t.assert.strictEqual(d.decode(u(0, 0xd8, 0)), '\uFFFD') // single character
        t.assert.strictEqual(d.decode(u(0, 0xd8, 0xd8)), '\uFFFD') // single character
      })
    })

    describe('utf-16be', () => {
      test('does not produce more chars than truncated', (t) => {
        const d = new TextDecoder('utf-16be')
        t.assert.strictEqual(d.decode(u(0, 0, 0)), '\0\uFFFD') // two character, 0 was valid
        t.assert.strictEqual(d.decode(u(0, 42, 0)), '*\uFFFD') // two characters, * was valid
        t.assert.strictEqual(d.decode(u(0xd8, 0, 0)), '\uFFFD') // single character
        t.assert.strictEqual(d.decode(u(0xd8, 0, 0xd8)), '\uFFFD') // single character
      })
    })

    describe('windows-1252', () => {
      // Node.js fails on this
      // https://github.com/nodejs/node/issues/60888
      describe('maps bytes outside of latin1', () => {
        const m = '€\x81‚ƒ„…†‡ˆ‰Š‹Œ\x8DŽ\x8F\x90‘’“”•–—˜™š›œ\x9DžŸ'
        for (const fatal of [false, true]) {
          describe(fatal ? 'fatal' : 'loose', () => {
            for (const encoding of ['windows-1252', 'latin1', 'ascii']) {
              test(encoding, (t) => {
                const d = new TextDecoder(encoding, { fatal })
                t.assert.strictEqual(d.encoding, 'windows-1252')
                for (let i = 0; i < m.length; i++) t.assert.strictEqual(d.decode(u(128 + i)), m[i])
              })
            }
          })
        }
      })

      // iconv and whatwg-encoding fails on this
      // https://github.com/jsdom/whatwg-encoding/issues/22
      describe('does not contain unmapped chars', () => {
        for (const fatal of [false, true]) {
          describe(fatal ? 'fatal' : 'loose', () => {
            for (const encoding of ['windows-1252', 'latin1', 'ascii']) {
              test(encoding, (t) => {
                const d = new TextDecoder(encoding, { fatal })
                t.assert.strictEqual(d.encoding, 'windows-1252')
                for (const byte of [0x81, 0x8d, 0x8f, 0x90, 0x9d]) {
                  t.assert.strictEqual(d.decode(u(byte)), String.fromCharCode(byte))
                }
              })
            }
          })
        }
      })
    })

    // Node.js misses an implementation
    test('x-user-defined', (t) => {
      const encoding = 'x-user-defined'
      const loose = new TextDecoder(encoding)
      const fatal = new TextDecoder(encoding, { fatal: true })
      for (let byte = 0; byte < 256; byte++) {
        const str = String.fromCodePoint(byte >= 0x80 ? 0xf7_80 + byte - 0x80 : byte)
        t.assert.strictEqual(fatal.decode(Uint8Array.of(byte)), str, byte)
        t.assert.strictEqual(loose.decode(Uint8Array.of(byte)), str, byte)
      }
    })

    test('big5', (t) => {
      const loose = new TextDecoder('big5')
      const fatal = new TextDecoder('big5', { fatal: true })

      // Node.js fails on this
      t.assert.strictEqual(loose.decode(u(0x80)), '\uFFFD')
      t.assert.throws(() => fatal.decode(u(0x80)))
    })

    // https://npmjs.com/text-encoding and https://npmjs.com/whatwg-encoding fail on this
    test('iso-8859-8-i decodes the bytes the same way as iso-8859-8', (t) => {
      const i8 = new TextDecoder('iso-8859-8')
      const i8i = new TextDecoder('iso-8859-8-i')
      for (let i = 0; i < 256; i++) {
        t.assert.strictEqual(i8.decode(u(i)), i8i.decode(u(i)), `Byte: ${i}`)
      }
    })

    describe('single-byte selected tests', (t) => {
      const r = 0xff_fd
      const fixtures = {
        // Node.js fails these (iconv-lite / whatwg-encoding also fails some)
        'koi8-u': { 174: 1118, 190: 1038 },
        'windows-874': { 129: 129, 219: r, 220: r, 221: r, 222: r, 252: r, 253: r, 254: r, 255: r },
        'windows-1252': { 128: 8364, 129: 129, 130: 8218, 131: 402, 141: 141, 158: 382, 159: 376 },
        'windows-1253': { 129: 129, 136: 136, 159: 159, 170: r },
        'windows-1255': { 129: 129, 138: 138, 159: 159, 202: 1466 },
        // iconv-lite / whatwg-encoding fails these
        macintosh: { 189: 937, 219: 8364, 240: 63_743 },
        'windows-1250': { 129: 129, 131: 131, 136: 136, 144: 144, 152: 152 },
        'windows-1251': { 152: 152 },
        'windows-1254': { 129: 129, 140: 338, 141: 141, 144: 144, 157: 157, 158: 158, 222: 350 },
        'windows-1257': { 129: 129, 131: 131, 138: 138, 145: 8216, 159: 159, 208: 352, 255: 729 },
        'windows-1258': { 129: 129, 138: 138, 141: 141, 158: 158, 159: 376, 208: 272, 255: 255 },
        // Some impls miss some encodings
        'iso-8859-8-i': { 160: 160, 161: r, 162: 162, 222: r, 223: 8215, 254: 8207, 255: r },
        'iso-8859-16': { 128: 128, 160: 160, 161: 260, 252: 252, 253: 281, 254: 539, 255: 255 },
        'x-mac-cyrillic': { 128: 1040, 214: 247, 254: 1102, 255: 8364 },
      }

      for (const [encoding, map] of Object.entries(fixtures)) {
        test(encoding, (t) => {
          const fatal = new TextDecoder(encoding, { fatal: true })
          const loose = new TextDecoder(encoding)
          for (const [offset, codepoint] of Object.entries(map)) {
            const u8 = Uint8Array.of(Number(offset))
            const str = String.fromCodePoint(codepoint)
            t.assert.strictEqual(loose.decode(u8), str, `${offset} -> ${codepoint}`)
            if (codepoint === r) {
              t.assert.throws(() => fatal.decode(u8))
            } else {
              t.assert.strictEqual(fatal.decode(u8), str, `${offset} -> ${codepoint} (fatal)`)
            }
          }
        })
      }
    })

    // Chrome and WebKit fail at this, Firefox passes
    // This one might be tricky to get into WPT, as two major impls ignore spec here
    // https://github.com/whatwg/encoding/issues/115
    test('Concatenating two ISO-2022-JP outputs is not always valid', (t) => {
      const loose = new TextDecoder('iso-2022-jp')

      // Roman, example from spec
      {
        const fatal = new TextDecoder('iso-2022-jp', { fatal: true }) // Fresh instance because of sticky state, which is a separate test
        const a = u(0x1b, 0x28, 0x4a, 0x5c, 0x1b, 0x28, 0x42) // switch to Roman, select char, switch to ascii
        t.assert.strictEqual(fatal.decode(a), '\xA5')
        t.assert.strictEqual(loose.decode(a), '\xA5')
        t.assert.throws(() => fatal.decode(u(...a, ...a)))
        t.assert.strictEqual(loose.decode(u(...a, ...a)), '\xA5\uFFFD\xA5')
      }

      // jis
      {
        const fatal = new TextDecoder('iso-2022-jp', { fatal: true }) // Fresh instance because of sticky state, which is a separate test
        const a = u(0x1b, 0x24, 0x42, 0x30, 0x30, 0x1b, 0x28, 0x42) // switch to jis, select char, switch to ascii
        t.assert.strictEqual(fatal.decode(a), '\u65ED')
        t.assert.strictEqual(loose.decode(a), '\u65ED')
        t.assert.throws(() => fatal.decode(u(...a, ...a)))
        t.assert.strictEqual(loose.decode(u(...a, ...a)), '\u65ED\uFFFD\u65ED')
      }
    })
  })

  for (const encoding of ['gb18030', 'gbk']) {
    test(`${encoding} version and ranges`, (t) => {
      const loose = new TextDecoder(encoding)
      const checkAll = (...list) => list.forEach((x) => check(...x))
      const check = (bytes, str, invalid = false) => {
        // Firefox also breaks if this is reused, due to state - there is a separate test for that
        const fatal = new TextDecoder(encoding, { fatal: true })
        const u8 = Uint8Array.from(bytes)
        t.assert.strictEqual(loose.decode(u8), str)
        if (!invalid) t.assert.strictEqual(fatal.decode(u8), str)
        if (invalid) t.assert.throws(() => fatal.decode(u8))
      }

      // Pointer ranges
      check([0x84, 0x31, 0xa4, 0x36], '\uFFFC') // pointer 39416
      check([0x84, 0x31, 0xa4, 0x37], '\uFFFD') // pointer 39417, valid representation for the replacement char
      check([0x84, 0x31, 0xa4, 0x38], '\uFFFE') // pointer 39418
      check([0x84, 0x31, 0xa4, 0x39], '\uFFFF') // pointer 39419
      check([0x84, 0x31, 0xa5, 0x30], '\uFFFD', true) // invalid pointer 39420
      check([0x8f, 0x39, 0xfe, 0x39], '\uFFFD', true) // invalid pointer 188999
      check([0x90, 0x30, 0x81, 0x30], String.fromCodePoint(0x1_00_00)) // pointer 189000
      check([0x90, 0x30, 0x81, 0x31], String.fromCodePoint(0x1_00_01)) // pointer 189001

      // Max codepoint
      check([0xe3, 0x32, 0x9a, 0x35], String.fromCodePoint(0x10_ff_ff)) // pointer 1237575
      check([0xe3, 0x32, 0x9a, 0x36], '\uFFFD', true)
      check([0xe3, 0x32, 0x9a, 0x37], '\uFFFD', true)

      // Max bytes
      check([0xfe, 0x39, 0xfe, 0x39], '\uFFFD', true)
      check([0xff, 0x39, 0xfe, 0x39], '\uFFFD9\uFFFD', true)
      check([0xfe, 0x40, 0xfe, 0x39], '\uFA0C\uFFFD', true)
      check([0xfe, 0x39, 0xff, 0x39], '\uFFFD9\uFFFD9', true)
      check([0xfe, 0x39, 0xfe, 0x40], '\uFFFD9\uFA0C', true)

      // https://github.com/whatwg/encoding/issues/22
      checkAll([[0xa8, 0xbb], '\u0251'], [[0xa8, 0xbc], '\u1E3F'], [[0xa8, 0xbd], '\u0144'])
      check([0x81, 0x35, 0xf4, 0x36], '\u1E3E') // ajascent
      check([0x81, 0x35, 0xf4, 0x37], '\uE7C7')
      check([0x81, 0x35, 0xf4, 0x38], '\u1E40') // ajascent

      // https://github.com/whatwg/encoding/pull/336
      checkAll([[0xa6, 0xd9], '\uFE10'], [[0xa6, 0xed], '\uFE18'], [[0xa6, 0xf3], '\uFE19']) // assymetric
      checkAll([[0xfe, 0x59], '\u9FB4'], [[0xfe, 0xa0], '\u9FBB']) // assymetric
    })
  }

  // Node.js has this wrong
  test('gbk decoder is gb18030 decoder', (t) => {
    const gbk = new TextDecoder('gbk')
    const gb18030 = new TextDecoder('gb18030')
    const check = (...list) => {
      for (const bytes of list) {
        const u8 = Uint8Array.from(bytes)
        t.assert.strictEqual(gbk.decode(u8), gb18030.decode(u8), bytes)
      }
    }

    check([0, 255], [128, 255], [129, 48], [129, 255], [254, 48], [254, 255], [255, 0], [255, 255])
  })

  describe('Replacement, push back ASCII characters', () => {
    const vectors = {
      big5: [
        [[0x80], '\uFFFD'], // Node.js fails
        [[0x81, 0x40], '\uFFFD@'], // WebKit fails: https://bugs.webkit.org/show_bug.cgi?id=304238. Chrome and Firefox are correct. Node.js fails (see below)
        [[0x83, 0x5c], '\uFFFD\x5C'], // Node.js fails: https://github.com/nodejs/node/issues/40091. Chrome and Firefox are correct. WebKit fails (see above)
        [[0x87, 0x87, 0x40], '\uFFFD@'], // Chrome fails: https://issues.chromium.org/issues/467727340. Firefox and WebKit are correct. iconv/whatwg-encoding fails
        [[0x81, 0x81], '\uFFFD'], // Chrome fails: https://issues.chromium.org/issues/467727340. Firefox and WebKit are correct. iconv/whatwg-encoding fails
      ],
      'iso-2022-jp': [
        [[0x1b, 0x24], '\uFFFD$'], // Node.js fails on this. Chrome, Firefox and Safari are correct
        [[0x1b, 0x24, 0x40, 0x1b, 0x24], '\uFFFD\uFFFD'], // Last 0x24 is invalid on both attemtps. Chrome, WebKit, text-encoding fail on this. Firefox, Deno, Servo are correct
      ],
      gb18030: [
        [[0xa0, 0x30, 0x2b], '\uFFFD0+'],
        [[0x81, 0x31], '\uFFFD'], // iconv / whatwg-encoding fails
      ],
      'euc-jp': [
        [[0x80], '\uFFFD'], // Node.js fails
        [[0x8d, 0x8d], '\uFFFD\uFFFD'], // coherence
        [[0x8e, 0x8e], '\uFFFD'], // iconv / whatwg-encoding, text-encoding fail
      ],
      'euc-kr': [
        [[0x80], '\uFFFD'], // Node.js fails
        [[0xad, 0xad], '\uFFFD'], // iconv / whatwg-encoding fails
        [[0x41, 0xc7, 0x41], 'A\uFFFDA'], // text-encoding fails. Chrome, Firefox, Webkit are correct
      ],
      shift_jis: [
        [[0x85, 0x85], '\uFFFD'], // iconv / whatwg-encoding fails
      ],
      // TODO: more vectors?
    }

    vectors.gbk = vectors.gb18030
    for (const [encoding, list] of Object.entries(vectors)) {
      describe(encoding, () => {
        for (const fatal of [false, true]) {
          test(fatal ? 'fatal' : 'loose', (t) => {
            for (const [bytes, text] of list) {
              const d = new TextDecoder(encoding, { fatal })
              if (fatal) {
                t.assert.throws(() => d.decode(Uint8Array.from(bytes)))
              } else {
                t.assert.strictEqual(d.decode(Uint8Array.from(bytes)), text)
              }
            }
          })
        }
      })
    }
  })

  // Chrome, Firefox and Safari all fail on this
  // https://issues.chromium.org/issues/467624168
  describe('Sticky multibyte state', () => {
    const vectors = {
      'iso-2022-jp': [
        [[27], '\uFFFD'], // In Safari, attempting to decode this in fatal mode fails also the _next_ decode() call with valid data
        [[27, 0x28], '\uFFFD('], // Fails in Chrome
        [[0x1b, 0x28, 0x49], ''],
      ],
      gb18030: [
        [[0xfe], '\uFFFD'],
        [[0xfe, 0x39], '\uFFFD'],
        [[0xfe, 0x39, 0xfe], '\uFFFD'],
        [[0xfe, 0x39, 0xfe, 0x39], '\uFFFD'],
        [[0xff], '\uFFFD'],
        [[0xfe, 0xff], '\uFFFD'],
        [[0xfe, 0x39, 0xff], '\uFFFD9\uFFFD'],
        [[0xfe, 0x39, 0xfe, 0x40], '\uFFFD9\uFA0C'],
        [[0x81], '\uFFFD'],
        [[0x81, 0x3a], '\uFFFD:'],
        [[0x81, 0x3a, 0x81], '\uFFFD:\uFFFD'],
      ],
      big5: [
        [[0x87, 0x3a], '\uFFFD:'],
        [[0x87, 0x3a, 0x87], '\uFFFD:\uFFFD'],
      ],
      shift_jis: [
        [[0x81, 0x3a], '\uFFFD:'],
        [[0x81, 0x3a, 0x81], '\uFFFD:\uFFFD'],
      ],
      'euc-kr': [
        [[0x81, 0x3a], '\uFFFD:'],
        [[0x81, 0x3a, 0x81], '\uFFFD:\uFFFD'],
      ],
    }

    vectors.gbk = vectors.gb18030
    for (const [encoding, list] of Object.entries(vectors)) {
      describe(encoding, () => {
        for (const fatal of [false, true]) {
          test(fatal ? 'fatal' : 'loose', (t) => {
            for (const [bytes, text] of list) {
              const d = new TextDecoder(encoding, { fatal })
              t.assert.strictEqual(d.decode(u(0x40)), '@') // ascii

              if (fatal && text.includes('\uFFFD')) {
                t.assert.throws(() => d.decode(Uint8Array.from(bytes)))
              } else {
                t.assert.strictEqual(d.decode(Uint8Array.from(bytes)), text)
              }

              // ascii
              t.assert.strictEqual(d.decode(u(0x40)), '@') // Check that previous decode() call did not affect the next one
              t.assert.strictEqual(d.decode(u(0x2a)), '*') // Or the next one
              t.assert.strictEqual(d.decode(u(0x42)), 'B') // Or the next one (this fails in Safari too)
            }
          })
        }
      })
    }

    describe('euc-jp', () => {
      for (const fatal of [false, true]) {
        // Fails in Safari
        test(fatal ? 'fatal' : 'loose', (t) => {
          const d = new TextDecoder('euc-jp', { fatal })
          t.assert.strictEqual(d.decode(Uint8Array.of(0xa1, 0xa1)), '\u3000')

          if (fatal) {
            t.assert.throws(() => d.decode(Uint8Array.of(0x8f, 0xa1)))
          } else {
            t.assert.strictEqual(d.decode(Uint8Array.of(0x8f, 0xa1)), '\uFFFD')
          }

          t.assert.strictEqual(d.decode(Uint8Array.of(0xa1, 0xa1)), '\u3000')
        })
      }
    })
  })

  describe('BOM handling', () => {
    // Firefox fails on this
    // https://bugzilla.mozilla.org/show_bug.cgi?id=2005419
    describe('Sticky fatal BOM', () => {
      test('utf-8', (t) => {
        const d = new TextDecoder('utf-8', { fatal: true })

        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xef, 0xbb, 0xbf)), '')

        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xef, 0xbb, 0xbf, 0x40)), '@')

        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf)), '\uFEFF')
      })

      test('utf-16le', (t) => {
        const d = new TextDecoder('utf-16le', { fatal: true })
        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xff, 0xfe)), '')

        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xff, 0xfe, 0x40, 0x00)), '@')

        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xff, 0xfe, 0xff, 0xfe)), '\uFEFF')
      })

      test('utf-16be', (t) => {
        const d = new TextDecoder('utf-16be', { fatal: true })
        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xfe, 0xff)), '')

        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xfe, 0xff, 0x00, 0x40)), '@')

        t.assert.throws(() => d.decode(u(0xff)))
        t.assert.strictEqual(d.decode(u(0xfe, 0xff, 0xfe, 0xff)), '\uFEFF')
      })
    })

    describe('BOM splitting / repeats', () => {
      // Bun fails at this
      test('utf-8', (t) => {
        const d = new TextDecoder()
        const check = (a, opt, str) => t.assert.strictEqual(d.decode(Uint8Array.from(a), opt), str)

        check([0x01, 0x02], { stream: true }, '\x01\x02')
        check([0x03], {}, '\x03') // close

        check([0xef, 0xbb], { stream: true }, '')
        check([0xbf], { stream: true }, '')
        check([0xef, 0xbb], { stream: true }, '')
        check([0xbf], { stream: true }, '\uFEFF')
        check([0x42], {}, 'B') // close

        check([0xef], { stream: true }, '')
        check([0xbb], { stream: true }, '')
        check([0xbf], { stream: true }, '')
        check([0xef], { stream: true }, '')
        check([0xbb], { stream: true }, '')
        check([0xbf], { stream: true }, '\uFEFF')
        check([0xef, 0xbb, 0xbf], { stream: true }, '\uFEFF')
        check([0x41], {}, 'A') // close

        check([], { stream: true }, '')
        check([0xef, 0xbb], { stream: true }, '')
        check([0xbf, 0x43], {}, 'C') // close

        check([0xef], { stream: true }, '')
        check([0xbb, 0xbf, 42, 43], {}, '*+') // close

        // https://github.com/facebook/hermes/pull/1855#issuecomment-3633217171
        {
          const d = new TextDecoder()
          t.assert.strictEqual(d.decode(u(0, 0), { stream: true }), '\0\0')
          t.assert.strictEqual(d.decode(u(0)), '\0')
          t.assert.strictEqual(d.decode(u(0xef, 0xbb), { stream: true }), '') // empty string
          t.assert.strictEqual(d.decode(u(0xbf)), '') // empty string
        }
      })

      // Bun fails at this
      test('utf-16le', (t) => {
        const d = new TextDecoder('utf-16le')
        const check = (a, opt, str) => t.assert.strictEqual(d.decode(Uint8Array.from(a), opt), str)

        check([0xff, 0xfe], { stream: true }, '')
        check([0x03, 0x00], {}, '\x03') // close

        check([0xff], { stream: true }, '')
        check([0xfe, 0x03, 0x00], {}, '\x03') // close

        check([0xff, 0xfe], { stream: true }, '')
        check([0xff, 0xfe, 0x03, 0x00], {}, '\uFEFF\x03') // close

        check([0xff], { stream: true }, '')
        check([0xfe, 0xff, 0xfe, 0x03, 0x00], {}, '\uFEFF\x03') // close
      })

      // Bun fails at this
      test('utf-16be', (t) => {
        const d = new TextDecoder('utf-16be')
        const check = (a, opt, str) => t.assert.strictEqual(d.decode(Uint8Array.from(a), opt), str)

        check([0xfe, 0xff], { stream: true }, '')
        check([0x00, 0x03], {}, '\x03') // close

        check([0xfe], { stream: true }, '')
        check([0xff, 0x00, 0x03], {}, '\x03') // close

        check([0xfe, 0xff], { stream: true }, '')
        check([0xfe, 0xff, 0x00, 0x03], {}, '\uFEFF\x03') // close

        check([0xfe], { stream: true }, '')
        check([0xff, 0xfe, 0xff, 0x00, 0x03], {}, '\uFEFF\x03') // close
      })
    })
  })

  describe('stream', () => {
    // Chrome is incorrect. It also decodes fetch() responses wrong for utf-8
    // https://issues.chromium.org/issues/468458744
    test('utf-8', (t) => {
      const u8 = Uint8Array.of(0xf0, 0xc3, 0x80, 42, 42)
      const str = new TextDecoder().decode(u8)
      t.assert.strictEqual(str, '\uFFFD\xC0**')

      const d = new TextDecoder()
      const chunks = [
        d.decode(u8.subarray(0, 1), { stream: true }),
        d.decode(u8.subarray(1), { stream: true }),
        d.decode(),
      ]
      t.assert.strictEqual(chunks.join(''), str)

      // https://github.com/facebook/hermes/pull/1855#issuecomment-3630446958
      const r = '\uFFFD'
      t.assert.strictEqual(new TextDecoder().decode(u(0xc0), { stream: true }), r)
      t.assert.strictEqual(new TextDecoder().decode(u(0xff), { stream: true }), r)
      t.assert.strictEqual(new TextDecoder().decode(u(0xed, 0xbf), { stream: true }), `${r}${r}`)
    })

    const vectors = {
      gbk: [
        [[0x81, 0x82], '\u4E97'], // valid
        [[0xa0, 0x30, 0x2b], '\uFFFD0+'], // replacement
      ],
      gb18030: [
        [[0x81, 0x82], '\u4E97'], // valid
        [[0xa0, 0x30, 0x2b], '\uFFFD0+'], // replacement
      ],
      big5: [[[0xfe, 0x40], '\u9442']],
      shift_jis: [[[0x81, 0x87], '\u221E']],
      'euc-kr': [[[0x81, 0x41], '\uAC02']],
      'euc-jp': [[[0xb0, 0xb0], '\u65ED']],
      'iso-2022-jp': [[[0x2a, 0x1b], '*\uFFFD']],
    }

    for (const [encoding, list] of Object.entries(vectors)) {
      test(encoding, (t) => {
        for (const [bytes, expected] of list) {
          const u8 = Uint8Array.from(bytes)
          const str = new TextDecoder(encoding).decode(u8)
          t.assert.strictEqual(str, expected)

          // Bun is incorrect
          {
            const d = new TextDecoder(encoding)
            const chunks = [d.decode(u8.subarray(0, 1), { stream: true }), d.decode(u8.subarray(1))]
            t.assert.strictEqual(chunks.join(''), str)
          }

          // Bun is incorrect
          {
            const d = new TextDecoder(encoding)
            const chunks = [
              d.decode(u8.subarray(0, 1), { stream: true }),
              d.decode(u8.subarray(1), { stream: true }),
              d.decode(),
            ]
            t.assert.strictEqual(chunks.join(''), str)
          }

          // Deno, Servo and Bun are incorrect on big5, shift_jis, euc-kr
          // https://github.com/hsivonen/encoding_rs/issues/126
          {
            const d = new TextDecoder(encoding)
            const chunks = [
              d.decode(u8.subarray(0, 1), { stream: true }),
              d.decode(Uint8Array.of(), { stream: true }),
              d.decode(u8.subarray(1), { stream: true }),
              d.decode(),
            ]
            t.assert.strictEqual(chunks.join(''), str)
          }

          // Node.js throws an "data was not valid for encoding" error in replacement mode
          {
            const d = new TextDecoder(encoding)
            const chunks = [
              d.decode(u8.subarray(0, 2), { stream: true }),
              d.decode(u8.subarray(2), { stream: true }),
              d.decode(),
            ]
            t.assert.strictEqual(chunks.join(''), str)
          }
        }
      })
    }
  })

  describe('fatal stream', () => {
    test('utf-8', (t) => {
      {
        const d = new TextDecoder('utf-8', { fatal: true })
        t.assert.throws(() => d.decode(u(0xc0), { stream: true }))
        t.assert.throws(() => d.decode(u(0xff), { stream: true }))
        t.assert.strictEqual(d.decode(), '')
      }

      {
        const loose = new TextDecoder('utf-8')
        t.assert.strictEqual(loose.decode(u(0xfd, 0xef), { stream: true }), '\uFFFD')
        t.assert.strictEqual(loose.decode(), '\uFFFD')

        const fatal = new TextDecoder('utf-8', { fatal: true })
        t.assert.throws(() => fatal.decode(u(0xfd, 0xef), { stream: true }))
        t.assert.strictEqual(fatal.decode(), '')
      }
    })

    // https://github.com/facebook/hermes/pull/1855#issuecomment-3632349129
    for (const encoding of ['utf-16le', 'utf-16be']) {
      test(encoding, (t) => {
        const d = new TextDecoder(encoding, { fatal: true })
        t.assert.strictEqual(d.decode(u(0x00), { stream: true }), '')
        t.assert.throws(() => d.decode())
        t.assert.strictEqual(d.decode(), '')
      })
    }

    test('iso-2022-jp', (t) => {
      // This is the only decoder which does not clear internal state before throwing in stream mode (non-EOF throws)
      // So the internal state of this decoder can legitimately persist after an error was thrown

      // Bun is incorrect
      {
        const d = new TextDecoder('iso-2022-jp', { fatal: true })
        t.assert.strictEqual(d.decode(Uint8Array.of(0x7e)), '\x7E')
        t.assert.throws(() => d.decode(u(0x1b, 0x28, 0x4a, 0xff), { stream: true })) // Switch to Roman, error
        t.assert.strictEqual(d.decode(Uint8Array.of(0x7e)), '\u203E')
      }

      // Bun is incorrect
      {
        const d = new TextDecoder('iso-2022-jp', { fatal: true })
        t.assert.strictEqual(d.decode(Uint8Array.of(0x42)), 'B')
        t.assert.throws(() => d.decode(u(0x1b, 0x28, 0x49, 0xff), { stream: true })) // Switch to Katakana, error
        t.assert.strictEqual(d.decode(Uint8Array.of(0x42)), '\uFF82')
      }

      // Pushback queue should be cleared though
      // Chrome and WebKit are wrong. Firefox is correct
      {
        const d = new TextDecoder('iso-2022-jp', { fatal: true })
        t.assert.strictEqual(d.decode(Uint8Array.of(0x42)), 'B')
        t.assert.throws(() => d.decode(u(0x1b, 0x21, 0x22), { stream: true })) // Invalid escape
        t.assert.strictEqual(d.decode(Uint8Array.of(0x42)), 'B')
      }
    })

    // Firefox, Deno and Servo are wrong. Chrome and WebKit are correct
    for (const encoding of ['gb18030', 'gbk']) {
      test(encoding, (t) => {
        {
          const d = new TextDecoder(encoding, { fatal: true })
          t.assert.strictEqual(d.decode(Uint8Array.of(0x80), { stream: true }), '\u20AC')
          t.assert.throws(() => d.decode(u(0x81, 0x30, 0x21, 0x21, 0x21), { stream: true }))
          t.assert.strictEqual(d.decode(Uint8Array.of(0x80)), '\u20AC') // pushback is cleared
        }

        {
          const d = new TextDecoder(encoding, { fatal: true })
          t.assert.strictEqual(d.decode(Uint8Array.of(0x80), { stream: true }), '\u20AC')
          t.assert.throws(() => d.decode(u(0x81, 0x30, 0x81, 0x42, 0x42), { stream: true }))
          t.assert.strictEqual(d.decode(Uint8Array.of(0x80)), '\u20AC') // pushback is cleared
        }
      })
    }
  })

  // These are mislabeled in WPT html dataset files, their recorded codepoints do not match actual ones
  // All browsers (and the script) agree on how these are decoded though, but let's explicitly recheck
  // Refs: https://github.com/web-platform-tests/wpt/issues/56748
  describe('WPT mislabels', () => {
    const vectors = {
      'euc-jp': [
        [[0x5c], '\x5C'], // Not U+A5
        [[0x7e], '\x7E'], // Not U+203E
        [[0xa1, 0xdd], '\uFF0D'], // Not U+2212
      ],
      shift_jis: [
        [[0x5c], '\x5C'], // Not U+A5
        [[0x7e], '\x7E'], // Not U+203E
        [[0x81, 0x7c], '\uFF0D'], // Not U+2212
      ],
      'iso-2022-jp': [
        [[0x1b, 0x28, 0x4a, 0x5c, 0x1b, 0x28, 0x42], '\xA5'], // Correctly labeled, U+A5
        [[0x1b, 0x28, 0x4a, 0x7e, 0x1b, 0x28, 0x42], '\u203E'], // Correctly labeled, U+203E
        [[0x1b, 0x24, 0x42, 0x21, 0x5d, 0x1b, 0x28, 0x42], '\uFF0D'], // Not U+2212
      ],
    }

    for (const [encoding, list] of Object.entries(vectors)) {
      describe(encoding, () => {
        for (const fatal of [false, true]) {
          test(fatal ? 'fatal' : 'loose', (t) => {
            for (const [bytes, string] of list) {
              const d = new TextDecoder(encoding, { fatal })
              t.assert.strictEqual(d.decode(Uint8Array.from(bytes)), string)
            }
          })
        }
      })
    }
  })

  describe('labels', () => {
    // Node.js fails on this
    test('invalid non-ascii', (t) => {
      const bad = ['\u212Aoi8-r', '\u212Aoi8-u', 'euc-\u212Ar']
      for (const label of bad) t.assert.throws(() => new TextDecoder(label))
    })

    // https://github.com/facebook/hermes/pull/1855#issuecomment-3632092843
    test('transformed', (t) => {
      t.assert.strictEqual(new TextDecoder('UTF-8').encoding, 'utf-8')
      t.assert.strictEqual(new TextDecoder('UTF-8'.toLowerCase()).encoding, 'utf-8') // Do not remove .toLowerCase() from test
    })
  })

  // text-encoding is wrong, naive whatwg-encoding usage fails too
  // https://webidl.spec.whatwg.org/#dfn-get-buffer-source-copy
  // 7. If IsDetachedBuffer(jsArrayBuffer) is true, then return the empty byte sequence.
  test('decoding detached returns empty data', { skip: !globalThis.MessageChannel }, (t) => {
    for (const fatal of [false, true]) {
      const decoder = new TextDecoder('utf-8', { fatal })
      const a = new ArrayBuffer(2)
      const b = new Uint8Array(a)
      b[0] = 0x24
      b[1] = 0x25
      t.assert.strictEqual(decoder.decode(a), '$%')
      t.assert.strictEqual(decoder.decode(b), '$%')
      // second time
      t.assert.strictEqual(decoder.decode(a), '$%')
      t.assert.strictEqual(decoder.decode(b), '$%')
      new MessageChannel().port1.postMessage(a, [a])
      // but not anymore
      t.assert.strictEqual(decoder.decode(a), '')
      t.assert.strictEqual(decoder.decode(b), '')
    }
  })
})
