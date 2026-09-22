import * as exodus from '@exodus/bytes/crc.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import crc from 'crc'
import crc32 from 'crc-32'
import { describe, test } from 'node:test'
import * as zlib from 'node:zlib'

import { Table } from './utils/table.js'

const columns = ['@exodus/bytes/crc32', 'crc', 'crc-32', 'zlib']

const seed = crypto.getRandomValues(new Uint8Array(5 * 1024))

const bufs32 = []
const bufs5mb = []
const N = 3000

for (let i = 0; i < N; i++) {
  bufs5mb.push(seed.map((x, j) => x + i * j))
  const at = Math.floor(Math.random() * 100)
  bufs32.push(seed.subarray(at, at + 32).map((x, j) => x + i * j))
}

describe('benchmarks: crc32', async () => {
  // [name, impl, skip]
  const libs = [
    ['@exodus/bytes/crc32', (x) => exodus.crc32(x)],
    ['crc', (x) => crc.crc32(x)],
    ['crc-32', (x) => crc32.buf(x)],
    ['zlib', (x) => zlib.crc32(x), !zlib.crc32],
  ]

  test('crc32 coherence', (t) => {
    for (let i = 0; i < 10; i++) {
      for (const [name, f, skip] of libs) {
        if (skip) continue
        t.assert.deepEqual(f(bufs32[i]) >>> 0, exodus.crc32(bufs32[i]), name)
        t.assert.deepEqual(f(bufs5mb[i]) >>> 0, exodus.crc32(bufs5mb[i]), name)
      }
    }
  })

  test('crc32, 32 bytes', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of libs) {
      res.add(name, await benchmark(`crc32: ${name}`, { skip, args: bufs32 }, f))
    }

    res.print(columns)
  })

  test('crc32, 5 KiB', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of libs) {
      res.add(name, await benchmark(`crc32: ${name}`, { skip, args: bufs5mb }, f))
    }

    res.print(columns)
  })
})
