// Based on https://github.com/bitcoinjs/bech32/tree/master/src/test

import { fromHex } from '@exodus/bytes/hex.js'
import * as lib from '@exodus/bytes/bech32.js'
import { test } from 'node:test'
import fixtures from './fixtures.cjs'

const lib32 = { fromBech32: lib.fromBech32, toBech32: lib.toBech32 }
const lib32m = { fromBech32: lib.fromBech32m, toBech32: lib.toBech32m }

function wordsToHex(words) {
  // Slow, but we use this only for tests
  if (words.length === 0) return ''
  const bytesLength = Math.floor((words.length * 5) / 8)
  const binary = words.map((x) => x.toString(2).padStart(5, '0')).join('') || '0'
  const num = BigInt(`0b${binary}`).toString(16)
  const hex = num.toString(16)
  return hex.padStart(bytesLength * 2, '0').slice(-bytesLength * 2)
}

const BAD =
  '11llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllludsr8' // Invalid padding, this is why there is no f.hex

function testValidFixture(f, bech32) {
  if (!f.hex && f.string === BAD) return
  const bytes = fromHex(f.hex)

  test(`wordsToHex ${f.hex}`, (t) => t.assert.strictEqual(wordsToHex(f.words), f.hex))

  test(`toBech32 ${f.prefix} ${f.hex || f.words}`, (t) => {
    t.assert.strictEqual(bech32.toBech32(f.prefix, bytes, f.limit), f.string.toLowerCase())
  })

  test(`decode ${f.string}`, (t) => {
    const expected = { prefix: f.prefix.toLowerCase(), bytes }
    t.assert.deepEqual(bech32.fromBech32(f.string, f.limit), expected)
  })

  test(`fails for ${f.string} with 1 bit flipped`, (t) => {
    const buffer = Buffer.from(f.string, 'utf8')
    buffer[f.string.lastIndexOf('1') + 1] ^= 0x1 // flip a bit, after the prefix
    const str = buffer.toString('utf8')
    t.assert.throws(() => bech32.fromBech32(str, f.limit), /Invalid checksum|Non-bech32 character/)
  })

  const wrongLib = bech32 === lib32 ? lib32m : lib32
  test(`fails for ${f.string} with wrong encoding`, (t) => {
    t.assert.throws(() => wrongLib.fromBech32(f.string, f.limit), /Invalid checksum/)
  })
}

function convertException(exception) {
  if (exception.endsWith('too short')) return /Input length is out of range/
  if (exception === 'Exceeds length limit') return /Input length is out of range/
  if (exception.startsWith('No separator character')) return /Missing or invalid prefix/
  if (exception.startsWith('Missing prefix')) return /Missing or invalid prefix/
  if (exception.startsWith('Invalid prefix')) return /Missing or invalid prefix/
  if (exception.startsWith('Invalid checksum')) return /Invalid checksum/
  if (exception.startsWith('Unknown character')) return /Non-bech32 character/
  if (exception.startsWith('Mixed-case string ')) return /Mixed-case string/
  return new RegExp(exception)
}

function testInvalidFixture(f, bech32) {
  if (f.prefix !== undefined && f.hex !== undefined) {
    const bytes = fromHex(wordsToHex(f.words))
    test(`encode fails with (${f.exception})`, (t) => {
      t.assert.throws(() => bech32.toBech32(f.prefix, bytes), new RegExp(f.exception))
    })
  }

  if (f.string !== undefined || f.stringHex) {
    const str = f.string || Buffer.from(f.stringHex, 'hex').toString('binary')

    test(`decode fails for ${str} (${f.exception})`, (t) => {
      t.assert.throws(() => bech32.fromBech32(str), convertException(f.exception))
    })
  }
}

for (const f of fixtures.bech32.valid) testValidFixture(f, lib32)
for (const f of fixtures.bech32.invalid) testInvalidFixture(f, lib32)
for (const f of fixtures.bech32m.valid) testValidFixture(f, lib32m)
for (const f of fixtures.bech32m.invalid) testInvalidFixture(f, lib32m)
