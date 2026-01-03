import * as exodus from '@exodus/bytes/bech32.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import { bech32 as scure } from '@scure/base'
import { bech32 } from '../node_modules/bech32/dist/index.js'
import { describe, test } from 'node:test'

import { Table } from './utils/table.js'

const columns = ['@exodus/bytes/bech32', 'scure.bech32', 'bech32']

// Shorter than in ./util, 20-50 bytes
const seed = crypto.getRandomValues(new Uint8Array(50))
const bufs = [new Uint8Array(10)]
const N = 3000
for (let i = 0; i < N; i++) {
  bufs.push(seed.subarray(Math.floor(Math.random() * 30)).map((x, j) => x + i * j))
}

describe('benchmarks: bech32', async () => {
  const strings = bufs.map((x) => exodus.toBech32('bc', x))

  // [name, impl, skip]
  const toBech32 = [
    ['@exodus/bytes/bech32', (x) => exodus.toBech32('bc', x)],
    ['bech32', (x) => bech32.encode('bc', bech32.toWords(x))],
    ['scure.bech32', (x) => scure.encode('bc', scure.toWords(x))],
  ]

  const fromBech32 = [
    ['@exodus/bytes/bech32', (x) => exodus.fromBech32(x).bytes],
    ['bech32', (x) => bech32.fromWords(bech32.decode(x).words)],
    ['scure.bech32', (x) => scure.fromWords(scure.decode(x).words)],
  ]

  test('toBech32 coherence', (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of toBech32) {
        if (!skip) t.assert.deepEqual(f(bufs[i]), strings[i], name)
      }
    }
  })

  test('toBech32', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of toBech32) {
      res.add(name, await benchmark(`toBech32: ${name}`, { skip, args: bufs }, f))
    }

    res.print(columns)
  })

  test('fromBech32 coherence', (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of fromBech32) {
        if (!skip) t.assert.deepStrictEqual(Uint8Array.from(f(strings[i])), bufs[i], name)
      }
    }
  })

  test('fromBech32', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of fromBech32) {
      res.add(name, await benchmark(`fromBech32: ${name}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })
})
