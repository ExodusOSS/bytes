// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/text-encoding.js'

import { toBase64 } from '@exodus/bytes/base64.js'
import { fromHex, toHex } from '@exodus/bytes/hex.js'
import { test, describe } from 'node:test'
import { fromBits, fromBase4 } from './_utils.js'
import { legacyMultiByte } from '../fixtures/encodings/encodings.cjs'

const skipLarge =
  process.env.EXODUS_TEST_PLATFORM === 'quickjs' ||
  process.env.EXODUS_TEST_PLATFORM === 'xs' ||
  process.env.EXODUS_TEST_PLATFORM === 'engine262'

describe('legacy multi-byte encodings snapshot tests', { skip: skipLarge }, () => {
  for (const local of [true, false]) {
    describe(local ? 'Fresh instance' : 'Reuse instance', () => {
      for (const label of legacyMultiByte) {
        if (['gbk', 'gb18030', 'big5', 'euc-kr'].includes(label)) continue // FIXME
        let loose, fatal

        test(label, (t) => {
          const out = []
          const lengths = []
          const flags = []

          const record = (u8) => {
            // See https://issues.chromium.org/issues/467624168
            if (local || !loose) loose = new TextDecoder(label)
            if (local || !fatal) fatal = new TextDecoder(label, { fatal: true })

            const a = loose.decode(u8)
            t.assert.ok(a.length > 0, `Bytes: ${toHex(u8)}`)
            let b
            let ok = false
            try {
              b = fatal.decode(u8)
              ok = true
            } catch {}

            // legacy multi-byte encodings are ASCII supersets, except iso-2022-jp
            if (label !== 'iso-2022-jp' && u8.filter((x) => x >= 128).length === 0) {
              t.assert.strictEqual(a, String.fromCodePoint.apply(String, u8))
              t.assert.strictEqual(b, String.fromCodePoint.apply(String, u8))
              t.assert.strictEqual(ok, true)
            }

            if (ok) t.assert.strictEqual(a, b, `Bytes: ${toHex(u8)}`)
            const hex = [...a].map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join('')
            flags.push(ok ? 1 : 0)
            lengths.push(a.length)
            out.push(hex)
          }

          for (let i = 0; i < 256; i++) {
            record(Uint8Array.of(i))
            for (let j = 0; j < 256; j++) {
              if (i <= j) record(Uint8Array.of(i, j))
              record(Uint8Array.of(i, j, j))
              record(Uint8Array.of(i, j, i))
            }
          }

          if (t.assert.snapshot) {
            t.assert.snapshot(toBase64(fromBits(flags.join(''))))
            t.assert.snapshot(toBase64(fromBase4(lengths.join('')))) // 1-3
            t.assert.snapshot(toBase64(fromHex(out.join(''))))
          } else {
            t.skip('Snapshots are not supported')
          }
        })
      }
    })
  }
})
