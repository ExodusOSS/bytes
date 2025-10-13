import * as exodus from '../base58check.js'
import { benchmark } from '@exodus/test/benchmark'
import { createBase58check as createScure } from '@scure/base'
import { sha256 } from '@noble/hashes/sha2.js'
import bs58check from 'bs58check'
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'

import { Table } from './utils/table.js'

const columns = ['@exodus/bytes/base58check', 'scure.base58check', 'bs58check']

// Shorter than in ./util, 20-40 bytes
const seed = crypto.getRandomValues(new Uint8Array(40))
const bufs = [new Uint8Array(10)]
const N = 3000
for (let i = 0; i < N; i++) {
  bufs.push(seed.subarray(Math.floor(Math.random() * 20)).map((x, j) => x + i * j))
}

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer

const scure = createScure(sha256)

describe('benchmarks: base58check', async () => {
  const strings = await Promise.all(bufs.map((x) => exodus.toBase58check(x)))

  // [name, impl, skip]
  const toBase58check = [
    ['@exodus/bytes/base58check', (x) => exodus.toBase58check(x)],
    ['bs58check', (x) => bs58check.encode(x)],
    ['scure.base58check', (x) => scure.encode(x)],
  ]

  // [name, impl, skip]
  const fromBase58check = [
    ['@exodus/bytes/base58check', (x) => exodus.fromBase58check(x)],
    ['bs58check', (x) => bs58check.decode(x)],
    ['scure.base58check', (x) => scure.decode(x)],
  ]

  test('toBase58check coherence', async (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of toBase58check) {
        if (!skip) t.assert.deepEqual(await f(bufs[i]), strings[i], name)
      }
    }
  })

  test('toBase58check', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of toBase58check) {
      res.add(name, await benchmark(`toBase58check: ${name}`, { skip, args: bufs }, f))
    }

    res.print(columns)
  })

  test('fromBase58check coherence', async (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of fromBase58check) {
        if (!skip) t.assert.deepEqual(await f(strings[i]), bufs[i], name)
      }
    }
  })

  test('fromBase58check', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of fromBase58check) {
      res.add(name, await benchmark(`fromBase58check: ${name}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })
})
