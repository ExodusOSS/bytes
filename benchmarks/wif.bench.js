import * as exodus from '@exodus/bytes/wif.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import * as wif from 'wif'
import { describe, test } from 'node:test'

import { Table } from './utils/table.js'

const columns = ['@exodus/bytes/wif', '@exodus/bytes/wif, sync', 'wif']

// Always 32 bytes
const seed = crypto.getRandomValues(new Uint8Array(1024))
const bufs = []
const N = 3000
for (let i = 0; i < N; i++) {
  const offset = Math.floor(Math.random() * (seed.length - 32))
  bufs.push(seed.subarray(offset, offset + 32).map((x, j) => x + i * j))
}

const wifs = bufs.map((x) => ({ version: 1, compressed: Math.random() < 0.5, privateKey: x }))
const strings = wifs.map((x) => exodus.toWifStringSync(x))

describe('benchmarks: wif', async () => {
  // [name, impl, skip]
  const toWifString = [
    ['@exodus/bytes/wif', (x) => exodus.toWifString(x)],
    ['@exodus/bytes/wif, sync', (x) => exodus.toWifStringSync(x)],
    ['wif', (x) => wif.encode(x)],
  ]

  const fromWifString = [
    ['@exodus/bytes/wif', (x) => exodus.fromWifString(x)],
    ['@exodus/bytes/wif, sync', (x) => exodus.fromWifStringSync(x)],
    ['wif', (x) => wif.decode(x)],
  ]

  test('toWifString coherence', async (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of toWifString) {
        if (!skip) t.assert.strictEqual(await f(wifs[i]), strings[i], name)
      }
    }
  })

  test('toWifString', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of toWifString) {
      res.add(name, await benchmark(`toWifString: ${name}`, { skip, args: wifs }, f))
    }

    res.print(columns)
  })

  test('fromWifString coherence', async (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of fromWifString) {
        if (!skip) t.assert.deepEqual(await f(strings[i]), wifs[i], name)
      }
    }
  })

  test('fromWifString', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of fromWifString) {
      res.add(name, await benchmark(`fromWifString: ${name}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })
})
