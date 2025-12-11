// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/text-encoding.js'

import { toBase64 } from '@exodus/bytes/base64.js'
import { fromHex, toHex } from '@exodus/bytes/hex.js'
import { test, describe } from 'node:test'
import { fromBits, fromBase4 } from './_utils.js'

const labels = ['utf-8', 'utf-16le', 'utf-16be']

const skipLarge =
  process.env.EXODUS_TEST_PLATFORM === 'quickjs' ||
  process.env.EXODUS_TEST_PLATFORM === 'xs' ||
  process.env.EXODUS_TEST_PLATFORM === 'engine262'

describe('Unicode encodings snapshot tests', { skip: skipLarge }, () => {
  for (const local of [true, false]) {
    describe(local ? 'Fresh instance' : 'Reuse instance', () => {
      for (const label of labels) {
        test(label, (t) => {
          let loose, fatal

          const out = []
          const lengths = []
          const flags = []

          const record = (u8) => {
            // See https://bugzilla.mozilla.org/show_bug.cgi?id=2005419
            if (local || !loose) loose = new TextDecoder(label)
            if (local || !fatal) fatal = new TextDecoder(label, { fatal: true })

            const a = loose.decode(u8)
            let b
            let ok = false
            try {
              b = fatal.decode(u8)
              ok = true
            } catch {}

            // UTF-8 is an ASCII superset
            if (label === 'utf-8' && u8.filter((x) => x >= 128).length === 0) {
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
              record(Uint8Array.of(i, j, i, j))
              record(Uint8Array.of(i, j, j, i))
              record(Uint8Array.of(i, j, j, i, j))
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
