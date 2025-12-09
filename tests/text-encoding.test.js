import { TextDecoder } from '@exodus/bytes/text-encoding.js'
import { test } from 'node:test'
import unfinishedBytesFixtures from './fixtures/text-encoding.unfinishedBytes.js'

test('Unfinished bytes', (t) => {
  for (const [encoding, trail, u8] of unfinishedBytesFixtures) {
    const decoder = new TextDecoder(encoding)
    const a0 = decoder.decode(u8, { stream: true })
    const b0 = decoder.decode()
    const ab = new TextDecoder(encoding).decode(u8)
    const a1 = new TextDecoder(encoding).decode(u8.subarray(0, u8.length - trail))
    const b1 = new TextDecoder(encoding).decode(u8.subarray(u8.length - trail))
    t.assert.strictEqual(a0, a1)
    t.assert.strictEqual(b0, b1)
    t.assert.strictEqual(a0 + b0, ab)
    t.assert.strictEqual(decoder.decode(u8), ab) // reuse

    if (trail === 0) {
      t.assert.strictEqual(a0, ab)
      t.assert.strictEqual(b0, '')
    }

    if (trail === u8.length) {
      t.assert.strictEqual(a0, '')
      t.assert.strictEqual(b0, ab)
    }
  }
})
