import { TextEncoder } from '@exodus/bytes/encoding.js'
import { test } from 'node:test'

test('TextEncoder returns non-pooled buffers', (t) => {
  const encoder = new TextEncoder()
  for (let i = 0; i < 256; i++) {
    t.assert.strictEqual(encoder.encode('x'.repeat(128)).buffer.byteLength, 128)
  }

  for (let i = 0; i < 256; i++) {
    t.assert.strictEqual(encoder.encode('x'.repeat(64)).buffer.byteLength, 64)
  }

  for (let i = 0; i < 512; i++) {
    t.assert.strictEqual(encoder.encode('x'.repeat(32)).buffer.byteLength, 32)
  }

  for (let i = 0; i < 512; i++) {
    t.assert.strictEqual(encoder.encode('').buffer.byteLength, 0)
  }
})
