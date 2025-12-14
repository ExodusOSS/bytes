// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/encoding.js'

import { keccakprg } from '@noble/hashes/sha3-addons.js'
import { test, describe } from 'node:test'
import { legacySingleByte, legacyMultiByte, unicode } from '../fixtures/encodings/encodings.cjs'

const fixedPRG = keccakprg() // We don't add any entropy, so it spills out predicatable results

// 128 buffers of increasing not-always-even lengths, 184 KiB
const seeds = []
for (let i = 1; i <= 128; i++) seeds.push(fixedPRG.randomBytes(23 * i))
const rand = () => fixedPRG.randomBytes(1)[0] / 256 // or Math.random()

function streamTest(t, label, testFatal) {
  for (const u8i of seeds) {
    const u8 = Uint8Array.from(u8i)
    const loose = new TextDecoder(label)
    const fatal = new TextDecoder(label, { fatal: true })
    const parts = []
    let at = 0
    let continiousValidBytes = 0
    while (at < u8.length) {
      const randsize = rand() > 0.8 ? 1 + Math.floor(rand() * rand() * rand() * 100) : 0 // prefer small chunks, 20% 0
      const delta = Math.min(u8.length - at, randsize)
      const u8s = u8.subarray(at, at + delta)
      at += delta

      const a = loose.decode(u8s, { stream: true })
      if (testFatal) {
        let b, ok
        const previousValidBytes = continiousValidBytes
        try {
          b = fatal.decode(u8s, { stream: true })
          ok = true
          continiousValidBytes += u8s.length
        } catch {
          continiousValidBytes = 0
        }

        // Can differ on multi-byte as the previous chunk might have caused a second error in next one
        // In fatal mode the queue from the previous invalid chunk is ignored, while in replacement it causes another error
        // It can also go the other way around: previous state causing next input to be valid for replacement but not for fatal
        // Continiuing streaming after fatal error can also completely switch the behavior for e.g. utf-32
        if (legacySingleByte.includes(label) || (label === 'utf-8' && previousValidBytes >= 3)) {
          if (ok) {
            t.assert.strictEqual(b, a)
          } else {
            t.assert.ok(a.includes('\uFFFD'))
          }
        }
      }

      parts.push(a)
    }

    const af = loose.decode()
    if (testFatal) {
      let bf, okf
      try {
        bf = fatal.decode()
        okf = true
      } catch {}

      if (legacySingleByte.includes(label) || (label === 'utf-8' && continiousValidBytes >= 3)) {
        if (okf) {
          t.assert.strictEqual(bf, af)
        } else {
          t.assert.ok(af.includes('\uFFFD'))
        }
      }
    }

    parts.push(af)

    t.assert.deepStrictEqual(u8, u8i, 'Input data pollution') // input is unpolluted
    t.assert.strictEqual(parts.join(''), new TextDecoder(label).decode(u8i))
  }
}

describe('stream=true in small chunks', () => {
  describe('Unicode', () => {
    for (const fatal of [false, true]) {
      describe(fatal ? 'fatal' : 'loose', () => {
        for (const label of unicode) {
          if (label !== 'utf-8' && fatal) continue // see comment above, utf-16 is hard to test here
          test(label, (t) => streamTest(t, label, fatal))
        }
      })
    }
  })

  describe('1-byte encodings', () => {
    for (const fatal of [false, true]) {
      describe(fatal ? 'fatal' : 'loose', () => {
        for (const label of legacySingleByte) test(label, (t) => streamTest(t, label, fatal))
      })
    }
  })

  describe('legacy multi-byte encodings', () => {
    // See comment above, fatal streaming is hard to test blindly for these
    for (const fatal of [false]) {
      describe(fatal ? 'fatal' : 'loose', () => {
        for (const label of legacyMultiByte) test(label, (t) => streamTest(t, label, fatal))
      })
    }
  })
})
