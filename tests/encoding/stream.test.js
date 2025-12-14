// Comment out this line to test on native impl, e.g. to cross-test in browsers
import { TextDecoder } from '@exodus/bytes/encoding.js'

import { keccakprg } from '@noble/hashes/sha3-addons.js'
import { test, describe } from 'node:test'
import { legacySingleByte, legacyMultiByte } from '../fixtures/encodings/encodings.cjs'

const fixedPRG = keccakprg() // We don't add any entropy, so it spills out predicatable results

// 64 buffers of increasing not-always-even lengths, 184 KiB
const seeds = []
for (let i = 1; i <= 64; i++) seeds.push(fixedPRG.randomBytes(23 * i))
const rand = () => fixedPRG.randomBytes(1)[0] / 256 // or Math.random()

function streamTest(t, label) {
  for (const u8i of seeds) {
    const u8 = Uint8Array.from(u8i)
    const loose = new TextDecoder(label)
    const fatal = new TextDecoder(label, { fatal: true })
    const parts = []
    let at = 0
    while (at < u8.length) {
      const randsize = rand() > 0.8 ? 1 + Math.floor(rand() * rand() * rand() * 100) : 0 // prefer small chunks, 20% 0
      const delta = Math.min(u8.length - at, randsize)
      const u8s = u8.subarray(at, at + delta)
      at += delta

      const a = loose.decode(u8s, { stream: true })
      let b
      let ok = false
      try {
        b = fatal.decode(u8s, { stream: true })
        ok = true
      } catch {}

      // TODO: check multibyte fatal streaming
      if (legacySingleByte.includes(label)) {
        if (ok) {
          t.assert.strictEqual(a, b)
        } else {
          t.assert.ok(a.includes('\uFFFD'))
        }
      }

      parts.push(a)
    }

    const af = loose.decode()
    let bf, okf
    try {
      bf = fatal.decode()
      okf = true
    } catch {}

    // TODO: check multibyte fatal streaming
    if (legacySingleByte.includes(label)) {
      if (okf) {
        t.assert.strictEqual(af, bf)
      } else {
        t.assert.ok(af.includes('\uFFFD'))
      }
    }

    parts.push(af)

    t.assert.deepStrictEqual(u8, u8i, 'Input data pollution') // input is unpolluted
    t.assert.strictEqual(parts.join(''), new TextDecoder(label).decode(u8i))
  }
}

describe('stream=true in small chunks', () => {
  describe('Unicode', () => {
    for (const label of ['utf-8', 'utf-16le', 'utf-16be']) test(label, (t) => streamTest(t, label))
  })

  describe('1-byte encodings', () => {
    for (const label of legacySingleByte) test(label, (t) => streamTest(t, label))
  })

  describe('legacy multi-byte encodings', () => {
    for (const label of legacyMultiByte) test(label, (t) => streamTest(t, label))
  })
})
