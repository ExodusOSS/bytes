// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/text-encoding.js'

import { toBase64 } from '@exodus/bytes/base64.js'
import { fromHex } from '@exodus/bytes/hex.js'
import { test, describe } from 'node:test'
import { fromBits } from './_utils.js'
import { legacySingleByte } from '../fixtures/encodings/encodings.cjs'

// All of the legacy 1-byte encodings are ASCII supersets
// Try all 1-byte inputs for each 1-byte encoding, validate ASCII ranges immediately and non-ASCII with snapsnots

describe('1-byte encodings snapshot tests', () => {
  for (const label of legacySingleByte) {
    describe(label, () => {
      const loose = new TextDecoder(label)
      const fatal = new TextDecoder(label, { fatal: true })
      const u8 = new Uint8Array(1)

      test('ascii', (t) => {
        for (let i = 0; i < 128; i++) {
          u8[0] = i

          const a = loose.decode(u8)
          t.assert.strictEqual(a.length, 1, `Byte: ${i}`)
          const b = fatal.decode(u8)
          t.assert.strictEqual(a, b, `Byte: ${i}`)
          t.assert.strictEqual(a.codePointAt(0), i, `Byte: ${i}`)
          t.assert.strictEqual(a, String.fromCodePoint(i), i, `Byte: ${i}`)
        }
      })

      test('non-ascii', (t) => {
        const out = []
        const flags = []
        for (let i = 128; i < 256; i++) {
          u8[0] = i

          const a = loose.decode(u8)
          t.assert.strictEqual(a.length, 1, `Byte: ${i}`)
          let b
          let ok = false
          try {
            b = fatal.decode(u8)
            ok = true
          } catch {}

          if (ok) t.assert.strictEqual(a, b, `Byte: ${i}`)
          const hex = [...a].map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join('')
          flags.push(ok ? 1 : 0)
          out.push(hex)
        }

        if (t.assert.snapshot) {
          t.assert.snapshot(toBase64(fromBits(flags.join(''))))
          t.assert.snapshot(toBase64(fromHex(out.join(''))))
        } else {
          t.skip('Snapshots are not supported')
        }
      })
    })
  }
})
