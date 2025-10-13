import * as exodus from '../base58.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import { base58 as scure } from '@scure/base'
import bs58 from 'bs58'
import { base58 as bstring } from 'bstring'
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'

import { Table } from './utils/table.js'

// micro-base58 is wrong on '1'.repeat(x) and is deprecated, so we don't test it
// base-x is the same as bs58, as bs58 just instantiates base-x with alphabet

const columns = [
  '@exodus/bytes/base58',
  'scure.base58',
  'bs58',
  'bstring', // native
]

// Shorter than in ./util, 20-40 bytes
const seed = crypto.getRandomValues(new Uint8Array(40))
const bufs = [new Uint8Array(10)]
const N = 3000
for (let i = 0; i < N; i++) {
  bufs.push(seed.subarray(Math.floor(Math.random() * 20)).map((x, j) => x + i * j))
}

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer
const toBuffer = (x) => Buffer.from(x.buffer, x.byteOffset, x.byteLength)

describe('benchmarks: base58', async () => {
  const strings = bufs.map((x) => exodus.toBase58(x))

  // [name, impl, skip]
  const toBase58 = [
    ['@exodus/bytes/base58', (x) => exodus.toBase58(x)],
    ['bs58', (x) => bs58.encode(x)],
    ['scure.base58', (x) => scure.encode(x)],
    ['bstring', (x) => bstring.encode(toBuffer(x))],
  ]

  // [name, impl, skip]
  const fromBase58 = [
    ['@exodus/bytes/base58', (x) => exodus.fromBase58(x)],
    ['bs58', (x) => bs58.decode(x)],
    ['scure.base58', (x) => scure.decode(x)],
    ['bstring', (x) => bstring.decode(x)],
  ]

  test('toBase58 coherence', (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of toBase58) {
        if (!skip) t.assert.deepEqual(f(bufs[i]), strings[i], name)
      }
    }
  })

  test('toBase58', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of toBase58) {
      res.add(name, await benchmark(`toBase58: ${name}`, { skip, args: bufs }, f))
    }

    res.print(columns)
  })

  test('fromBase58 coherence', (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of fromBase58) {
        if (!skip) t.assert.deepEqual(f(strings[i]), bufs[i], name)
      }
    }
  })

  test('fromBase58', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of fromBase58) {
      res.add(name, await benchmark(`fromBase58: ${name}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })
})
