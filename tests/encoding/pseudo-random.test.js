// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/encoding.js'

import { toBase64 } from '@exodus/bytes/base64.js'
import { fromHex } from '@exodus/bytes/hex.js'
import { keccakprg } from '@noble/hashes/sha3-addons.js'
import { test, describe } from 'node:test'
import { legacySingleByte, legacyMultiByte } from '../fixtures/encoding/encodings.cjs'
import { fromBits } from './_utils.js'

const skipLarge =
  process.env.EXODUS_TEST_PLATFORM === 'quickjs' ||
  process.env.EXODUS_TEST_PLATFORM === 'xs' ||
  process.env.EXODUS_TEST_PLATFORM === 'engine262'

describe('tests on long fixed random strings', { skip: skipLarge }, () => {
  const fixedPRG = keccakprg() // We don't add any entropy, so it spills out predicatable results

  // 64 buffers of increasing not-always-even lengths, 46 KiB
  const seeds = []
  for (let i = 1; i <= 128; i++) seeds.push(fixedPRG.randomBytes(23 * i))

  describe('1-byte encodings', () => {
    for (const label of legacySingleByte) {
      test(label, (t) => {
        const out = []
        const flags = []
        for (const u8 of seeds) {
          const loose = new TextDecoder(label)
          const fatal = new TextDecoder(label, { fatal: true })

          const a = loose.decode(u8)
          t.assert.strictEqual(a.length, u8.length)
          let b
          let ok = false
          try {
            b = fatal.decode(u8)
            ok = true
          } catch {}

          if (ok) t.assert.strictEqual(a, b)
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
    }
  })

  describe('legacy multi-byte encodings', () => {
    for (const label of legacyMultiByte) {
      test(label, (t) => {
        const out = []
        const flags = []
        for (const u8 of seeds) {
          const loose = new TextDecoder(label)
          const fatal = new TextDecoder(label, { fatal: true })

          const a = loose.decode(u8)
          let b
          let ok = false
          try {
            b = fatal.decode(u8)
            ok = true
          } catch {}

          if (ok) t.assert.strictEqual(a, b)
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
    }
  })
})
