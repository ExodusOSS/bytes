import * as exodus from '@exodus/bytes/base32.js'
import { benchmark } from '@exodus/test/benchmark' // eslint-disable-line @exodus/import/no-unresolved
import { base32nopad as scure } from '@scure/base'
import base32js from 'base32.js'
import hiBase32 from 'hi-base32'
import buffer from 'buffer/index.js'
import { describe, test } from 'node:test'

import { bufs } from './utils/random.js'
import { Table } from './utils/table.js'

const columns = ['@exodus/bytes/base32', 'scure.base32', 'base32.js', 'hi-base32']

if (!globalThis.Buffer) globalThis.Buffer = buffer.Buffer

describe('benchmarks: base32', async () => {
  const strings = bufs.map((x) => exodus.toBase32(x))

  // [name, impl, skip]
  const toBase32 = [
    ['@exodus/bytes/base32', (x) => exodus.toBase32(x)],
    ['base32.js', (x) => base32js.encode(x)],
    ['hi-base32', (x) => hiBase32.encode(x)],
    ['scure.base32', (x) => scure.encode(x)],
  ]

  // [name, impl, skip]
  const fromBase32 = [
    ['@exodus/bytes/base32', (x) => exodus.fromBase32(x)],
    ['base32.js', (x) => base32js.decode(x)],
    ['hi-base32', (x) => hiBase32.decode.asBytes(x)],
    ['scure.base32', (x) => scure.decode(x)],
  ]

  test('toBase32 coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of toBase32) {
        let res = f(bufs[i])
        if (name === 'hi-base32') res = res.replaceAll('=', '')
        if (!skip) t.assert.deepEqual(res, strings[i], name)
      }
    }
  })

  test('toBase32', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of toBase32) {
      res.add(name, await benchmark(`toBase32: ${name}`, { skip, args: bufs }, f))
    }

    res.print(columns)
  })

  test('fromBase32 coherence', (t) => {
    for (let i = 0; i < 100; i++) {
      for (const [name, f, skip] of fromBase32) {
        let res = f(strings[i])
        if (name === 'base32.js' || name === 'hi-base32') res = new Uint8Array(res) // those return plain arrays
        if (!skip) t.assert.deepEqual(res, bufs[i], name)
      }
    }
  })

  test('fromBase32', { timeout: 10_000 }, async () => {
    const res = new Table()
    for (const [name, f, skip] of fromBase32) {
      res.add(name, await benchmark(`fromBase32: ${name}`, { skip, args: strings }, f))
    }

    res.print(columns)
  })
})
