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
      test('does not produce more chars than truncated', (t) => {
        const d = new TextDecoder('utf-16le')
        t.assert.strictEqual(d.decode(u(0, 0, 0)), '\0\uFFFD') // two character, 0 was valid
        t.assert.strictEqual(d.decode(u(42, 0, 0)), '*\uFFFD') // two characters, * was valid
        t.assert.strictEqual(d.decode(u(0, 0xd8, 0)), '\uFFFD') // single character
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

    // Chrome fails at this
    // https://github.com/whatwg/encoding/issues/115
    test('Concatenating two ISO-2022-JP outputs is not always valid', (t) => {
      const fatal = new TextDecoder('iso-2022-jp', { fatal: true })
      const loose = new TextDecoder('iso-2022-jp')
      const a = u(0x1b, 0x24, 0x42, 0x30, 0x30, 0x1b, 0x28, 0x42) // switch to jis, select char, switch to ascii
      t.assert.strictEqual(fatal.decode(a), '\u65ED')
      t.assert.strictEqual(loose.decode(a), '\u65ED')
      t.assert.throws(() => fatal.decode(u(...a, ...a)))
      t.assert.strictEqual(loose.decode(u(...a, ...a)), '\u65ED\uFFFD\u65ED')
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

  // Chrome and WebKit fails on this
  describe('Push back ASCII characters on errors', () => {
    const vectors = {
      big5: [
        [[0x81, 0x40], '\uFFFD@'], // WebKit fails on this
        [[0x83, 0x5c], '\uFFFD\x5C'], // https://github.com/nodejs/node/issues/40091#issue-994273867
        [[0x87, 0x87, 0x40], '\uFFFD@'], // Chrome fails on this
      ],
      'iso-2022-jp': [
        [[0x1b, 0x24], '\uFFFD$'], // Node.js fails on this
        [[0x1b, 0x24, 0x40, 0x1b, 0x24], '\uFFFD\uFFFD'], // Last 0x24 is invalid on both attemtps. Chrome fails on this
      ],
      // TODO: more vectors?
    }

    // vectors.gbk = vectors.gb18030
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

    // Bun fails at this
    describe('BOM splitting', () => {
      test.only('utf-8', (t) => {
        const d = new TextDecoder()
        const check = (a, opt, str) => t.assert.strictEqual(d.decode(Uint8Array.from(a), opt), str)

        /*
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
        */

        check([0xef], { stream: true }, '')
        check([0xbb, 0xbf, 42, 43], {}, '*+') // close
      })
    })
  })

  describe('stream', () => {
    // Chrome is incorrect. It also decodes fetch() responses wrong for utf-8
    // https://issues.chromium.org/issues/468458744
    test('utf-8', (t) => {
      const u8 = Uint8Array.of(0xf0, 0xc3, 0x80, 42, 42)
      const str = new TextDecoder().decode(u8)
      t.assert.strictEqual(new TextDecoder().decode(u8), '\uFFFD\xC0**')

      const d = new TextDecoder()
      const chunks = [
        d.decode(u8.subarray(0, 1), { stream: true }),
        d.decode(u8.subarray(1), { stream: true }),
        d.decode(),
      ]
      t.assert.strictEqual(chunks.join(''), str)
    })
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

    for (const encoding of ['utf-16le', 'utf-16be']) {
      test(encoding, (t) => {
        const d = new TextDecoder(encoding, { fatal: true })
        t.assert.strictEqual(d.decode(u(0x00), { stream: true }), '')
        t.assert.throws(() => d.decode())
        t.assert.strictEqual(d.decode(), '')
      })
    }

    // Bun is incorrect
    test('iso-2022-jp', (t) => {
      // This is the only decoder which does not clear internal state before throwing in stream mode (non-EOF throws)
      // So the internal state of this decoder can legitimately persist after an error was thrown
      {
        const d = new TextDecoder('iso-2022-jp', { fatal: true })
        t.assert.strictEqual(d.decode(Uint8Array.of(0x7e)), '\x7E')
        t.assert.throws(() => d.decode(u(0x1b, 0x28, 0x4a, 0xff), { stream: true })) // Switch to Roman, error
        t.assert.strictEqual(d.decode(Uint8Array.of(0x7e)), '\u203E')
      }

      {
        const d = new TextDecoder('iso-2022-jp', { fatal: true })
        t.assert.strictEqual(d.decode(Uint8Array.of(0x42)), 'B')
        t.assert.throws(() => d.decode(u(0x1b, 0x28, 0x49, 0xff), { stream: true })) // Switch to Katakana, error
        t.assert.strictEqual(d.decode(Uint8Array.of(0x42)), '\uFF82')
      }
    })
  })
})
