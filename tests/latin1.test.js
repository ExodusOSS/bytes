import { asciiPrefix, decodeLatin1, encodeLatin1, encodeAscii } from '../fallback/latin1.js'
import { nativeEncoder } from '../fallback/_utils.js'
import { describe, test } from 'node:test'

const raw = [
  Uint8Array.of(),
  Uint8Array.of(0),
  Uint8Array.of(1),
  Uint8Array.of(255),
  new Uint8Array(12_345),
  new Uint8Array(12_543).fill(255),
  new Uint8Array(13_379).map((_, i) => i % 256),
]
for (let i = 0; i < 5; i++) {
  const size = Math.floor(Math.random() * 1024)
  raw.push(crypto.getRandomValues(new Uint8Array(size)))
}

const pool = raw.map((uint8) => {
  const asciiBytes = uint8.map((x) => x & 0x7f)
  const asciiString = Buffer.from(asciiBytes).toString()
  const latin1 = [...uint8].map((x) => String.fromCharCode(x)).join('')
  const isAscii = uint8.every((x) => x < 0x80)
  // uint8 -> string mapping could be corrupted by Buffer doing invalid conversion! isAscii is still correct for it though
  const string = Buffer.from(uint8).toString()
  return { uint8, asciiBytes, asciiString, latin1, isAscii, string }
})

describe('asciiPrefix', () => {
  test('ascii', (t) => {
    for (const { asciiBytes } of pool) {
      t.assert.strictEqual(asciiPrefix(asciiBytes), asciiBytes.length)
    }
  })

  test('random', (t) => {
    for (const { uint8 } of pool) {
      const pos = uint8.findIndex((x) => x >= 0x80)
      t.assert.strictEqual(asciiPrefix(uint8), pos >= 0 ? pos : uint8.length)
    }
  })

  test('specific', (t) => {
    for (const { asciiBytes } of pool) {
      for (let i = 0; i < 8; i++) {
        const bytes = Uint8Array.from(asciiBytes)
        const pos = Math.floor(Math.random() * bytes.length)
        bytes[pos] |= 0x80
        t.assert.strictEqual(asciiPrefix(bytes), pos)
      }
    }
  })
})

describe('encodeLatin1', { skip: !nativeEncoder }, () => {
  test('ascii', (t) => {
    for (const { asciiBytes, asciiString } of pool) {
      t.assert.deepStrictEqual(encodeLatin1(asciiString), asciiBytes)
    }
  })

  test('coherence (Buffer)', { skip: !globalThis.Buffer }, (t) => {
    for (const { uint8, latin1 } of pool) {
      t.assert.deepEqual(Buffer.from(latin1, 'latin1'), uint8)
    }
  })

  test('latin1', (t) => {
    for (const { uint8, latin1 } of pool) {
      t.assert.deepStrictEqual(encodeLatin1(latin1), uint8, latin1)
    }
  })
})

describe('decodeLatin1', { skip: !nativeEncoder }, () => {
  test('ascii', (t) => {
    for (const { asciiBytes, asciiString } of pool) {
      t.assert.strictEqual(decodeLatin1(asciiBytes), asciiString)
    }
  })

  test('coherence (Buffer)', { skip: !globalThis.Buffer }, (t) => {
    for (const { uint8, latin1 } of pool) {
      t.assert.strictEqual(Buffer.from(uint8).toString('latin1'), latin1)
    }
  })

  test('latin1', (t) => {
    for (const { uint8, latin1 } of pool) {
      t.assert.strictEqual(decodeLatin1(uint8), latin1, latin1)
    }
  })
})

describe('encodeAscii', { skip: !nativeEncoder }, () => {
  test('ascii', (t) => {
    for (const { asciiBytes, asciiString } of pool) {
      t.assert.deepStrictEqual(encodeAscii(asciiString), asciiBytes)
    }
  })

  test('random', (t) => {
    for (const { uint8, isAscii, string } of pool) {
      if (isAscii) {
        t.assert.deepStrictEqual(encodeAscii(string), uint8)
      } else {
        t.assert.throws(() => encodeAscii(string, 'ERR_MY'), /ERR_MY/)
      }
    }
  })
})
