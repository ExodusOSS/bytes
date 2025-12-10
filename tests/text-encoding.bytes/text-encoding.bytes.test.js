// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/text-encoding.js'

import { test, describe } from 'node:test'
// import { labels } from './fixtures/encodings/encodings.cjs'

const labels = ['iso-2022-jp', 'shift_jis']

// Try all 1-byte and 2-byte inputs and save the result in a snapshot

describe('one-byte snapshot tests', () => {
  for (const label of labels) {
    describe(label, () => {
      const u8 = new Uint8Array(1)
      for (const type of ['ascii', 'non-ascii']) {
        test(type, (t) => {
          const out = []
          const flags = []
          for (let i = 0; i < 256; i++) {
            const isAscii = i < 128
            if (isAscii !== (type === 'ascii')) continue
            u8[0] = i

            // See https://issues.chromium.org/issues/467624168, to cross-test with Chrome we want a clean decoder there
            const loose = new TextDecoder(label)
            const fatal = new TextDecoder(label, { fatal: true })
            const a = loose.decode(u8)
            t.assert.strictEqual(a.length, 1, `Byte: ${i}`)
            let b
            let ok = false
            try {
              b = fatal.decode(u8)
              ok = true
            } catch {}

            if (ok) t.assert.strictEqual(a, b, `Byte: ${i}`)
            out.push(a)
            flags.push(ok ? 1 : 0)
          }

          t.assert.snapshot(out.join(''))
          t.assert.snapshot(flags.join(''))
        })
      }
    })
  }
})

describe('two-byte snapshot tests', () => {
  for (const label of labels) {
    describe(label, () => {
      const u8 = new Uint8Array(2)
      for (const type of ['ascii', 'non-ascii']) {
        test(type, (t) => {
          const out = []
          const flags = []
          for (let i = 0; i < 256; i++) {
            u8[0] = i
            for (let j = 0; j < 256; j++) {
              const isAscii = i < 128 && j < 128
              if (isAscii !== (type === 'ascii')) continue
              u8[1] = j

              // See https://issues.chromium.org/issues/467624168, to cross-test with Chrome we want a clean decoder there
              const loose = new TextDecoder(label)
              const fatal = new TextDecoder(label, { fatal: true })
              const a = loose.decode(u8)
              t.assert.ok(a.length > 0, 1, `Bytes: ${i}, ${j}`)
              let b
              let ok = false
              try {
                b = fatal.decode(u8)
                ok = true
              } catch {}

              if (ok) t.assert.strictEqual(a, b, `Bytes: ${i}, ${j}`)
              const hex = [...a].map((c) => c.codePointAt(0).toString(16).padStart(4, '0')).join('')
              flags.push(ok ? 1 : 0)
              out.push(hex)
            }
          }

          t.assert.snapshot(out.join(' '))
          t.assert.snapshot(flags.join(''))
        })
      }
    })
  }
})
