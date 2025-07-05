import { fromUint8Super, fromBase64, fromHex } from '@exodus/bytes/convert'
import { describe, test } from '@exodus/test/node'

const raw = [new Uint8Array(), new Uint8Array([0]), new Uint8Array([1]), new Uint8Array([255])]
for (let i = 0; i < 50; i++) {
  const size = Math.floor(Math.random() * 100)
  raw.push(crypto.getRandomValues(new Uint8Array(size)))
}

const pool = raw.map((uint8) => {
  const buffer = Buffer.from(uint8)
  const base64 = buffer.toString('base64')
  const base64urlFallback = base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  let base64url = base64urlFallback
  try {
    base64url = buffer.toString('base64url') // unsupported by https://npmjs.com/package/buffer
  } catch {}
  if (base64url !== base64urlFallback) throw new Error('Unexpected base64url mismatch with Buffer')
  return { uint8, buffer, hex: buffer.toString('hex'), base64, base64url }
})

describe('fromUint8Super', () => {
  test('invalid input', (t) => {
    for (const input of [null, undefined, [], [1,2], new Uint16Array(1), 'string']) {
      t.assert.throws(() => fromUint8Super(input))
      for (const form of ['uint8', 'buffer', 'hex', 'base64', 'base64url']) {
        t.assert.throws(() => fromUint8Super(input, form))
      }
    }
  })

  test('uint8', (t) => {
    for (const { buffer, uint8 } of pool) {
      t.assert.strictEqual(fromUint8Super(uint8), uint8)
      t.assert.strictEqual(fromUint8Super(uint8, 'uint8'), uint8)
      const a = fromUint8Super(buffer)
      const b = fromUint8Super(buffer, 'uint8')
      t.assert.deepStrictEqual(a, uint8)
      t.assert.strictEqual(a.buffer, buffer.buffer)
      t.assert.deepStrictEqual(b, uint8)
      t.assert.strictEqual(b.buffer, buffer.buffer)
    }
  })

  test('buffer', (t) => {
    for (const { uint8, buffer } of pool) {
      t.assert.strictEqual(fromUint8Super(buffer, 'buffer'), buffer)
      const a = fromUint8Super(uint8, 'buffer')
      t.assert.deepStrictEqual(a, buffer)
      t.assert.strictEqual(a.buffer, uint8.buffer)
    }
  })

  test('hex, base64, base64url', (t) => {
    for (const { uint8, buffer, hex, base64, base64url } of pool) {
      t.assert.strictEqual(fromUint8Super(uint8, 'hex'), hex)
      t.assert.strictEqual(fromUint8Super(buffer, 'hex'), hex)
      t.assert.strictEqual(fromUint8Super(uint8, 'base64'), base64)
      t.assert.strictEqual(fromUint8Super(buffer, 'base64'), base64)
      t.assert.strictEqual(fromUint8Super(uint8, 'base64url'), base64url)
      t.assert.strictEqual(fromUint8Super(buffer, 'base64url'), base64url)
    }
  })
})

describe('fromHex', () => {
  test('invalid input', (t) => {
    for (const input of [null, undefined, [], [1,2], ['00'], new Uint8Array(), 'a', '0x00', 'ag']) {
      if (Uint8Array.fromHex) t.assert.throws(() => Uint8Array.fromHex(input))
      t.assert.throws(() => fromHex(input))
      for (const form of ['uint8', 'buffer', 'hex', 'base64', 'base64url']) {
        t.assert.throws(() => fromHex(input, form))
      }
    }
  })

  test('uint8', (t) => {
    for (const { hex, uint8 } of pool) {
      t.assert.deepStrictEqual(fromHex(hex), uint8)
      t.assert.deepStrictEqual(fromHex(hex, 'uint8'), uint8)
    }
  })

  test('buffer', (t) => {
    for (const { hex, buffer } of pool) {
      t.assert.deepStrictEqual(fromHex(hex, 'buffer'), buffer)
    }
  })

  test('hex, base64, base64url', (t) => {
    for (const { hex, base64, base64url } of pool) {
      t.assert.strictEqual(fromHex(hex, 'hex'), hex)
      t.assert.strictEqual(fromHex(hex, 'base64'), base64)
      t.assert.strictEqual(fromHex(hex, 'base64url'), base64url)
    }
  })
})

describe('fromBase64', () => {
  test('invalid input', (t) => {
    for (const input of [
      ...[null, undefined, [], [1,2], ['00'], new Uint8Array()],
      ...['a', 'aaaaa'], // wrong length
      ...['a==', '====', 'a=aa', 'aa=a', '=aaa'], // wrong padding
      ...['####', '@@@@', 'aaa#', 'a%aa'], // wrong chars
      ...['a-+a', 'aa+_', 'aa_/', '-a/a'], // mixed base64/base64url
    ]) {
      if (Uint8Array.fromBase64 && process.env.EXODUS_TEST_PLATFORM !== 'jsc') {
        t.assert.throws(() => Uint8Array.fromBase64(input))
        t.assert.throws(() => Uint8Array.fromBase64(input, { alphabet: 'base64' }))
        t.assert.throws(() => Uint8Array.fromBase64(input, { alphabet: 'base64url' }))
      }
      t.assert.throws(() => fromBase64(input))
      for (const form of ['uint8', 'buffer', 'hex', 'base64', 'base64url']) {
        t.assert.throws(() => fromBase64(input, form))
      }
    }
  })

  test('invalid input, additional checks', (t) => {
    for (const input of [
      ...[' ', 'aaaa aaaa', 'aaaa aaa', 'aa== ', 'aa =='], // spaces
      ...['_aY=', '_aa=', '-a==', '-Q=='], // padded base64url
    ]) {
      t.assert.throws(() => fromBase64(input))
      for (const form of ['uint8', 'buffer', 'hex', 'base64', 'base64url']) {
        t.assert.throws(() => fromBase64(input, form))
      }
    }
  })

  test('uint8', (t) => {
    for (const { base64, base64url, uint8 } of pool) {
      t.assert.deepStrictEqual(fromBase64(base64), uint8)
      t.assert.deepStrictEqual(fromBase64(base64, 'uint8'), uint8)
      t.assert.deepStrictEqual(fromBase64(base64url), uint8)
      t.assert.deepStrictEqual(fromBase64(base64url, 'uint8'), uint8)
    }
  })

  test('buffer', (t) => {
    for (const { base64, base64url, buffer } of pool) {
      t.assert.deepStrictEqual(fromBase64(base64, 'buffer'), buffer)
      t.assert.deepStrictEqual(fromBase64(base64url, 'buffer'), buffer)
    }
  })

  test('hex, base64, base64url', (t) => {
    for (const { hex, base64, base64url } of pool) {
      t.assert.strictEqual(fromBase64(base64, 'hex'), hex)
      t.assert.strictEqual(fromBase64(base64, 'base64'), base64)
      t.assert.strictEqual(fromBase64(base64, 'base64url'), base64url)
      t.assert.strictEqual(fromBase64(base64url, 'hex'), hex)
      t.assert.strictEqual(fromBase64(base64url, 'base64'), base64)
      t.assert.strictEqual(fromBase64(base64url, 'base64url'), base64url)
    }
  })
})
