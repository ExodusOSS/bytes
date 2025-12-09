import { gunzip } from '@exodus/crypto/compress'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, test } from 'node:test'
import { encodeLatin1 } from '../../../fallback/latin1.js'
import {
  utf8toString,
  utf8toStringLoose,
  utf8fromString,
  utf8fromStringLoose,
} from '@exodus/bytes/utf8.js'

import dataSmall from './data.js'

function testToString(t, data) {
  for (const { decoded, bytes, error, description, codePoint } of data) {
    if (error) continue
    t.assert.strictEqual(decoded, utf8toStringLoose(bytes), description || codePoint)
    t.assert.strictEqual(decoded, utf8toString(bytes), description || codePoint)
  }
}

function testFromString(t, data) {
  for (const { decoded, bytes, error, description, codePoint } of data) {
    if (error) continue // tests don't expect replacement somewhy
    t.assert.deepStrictEqual(bytes, utf8fromStringLoose(decoded), description || codePoint)
    t.assert.deepStrictEqual(bytes, utf8fromString(decoded), description || codePoint)
  }
}

describe('small', () => {
  for (const entry of dataSmall) entry.bytes = encodeLatin1(entry.encoded)
  test('utf8toString', (t) => testToString(t, dataSmall))
  test('utf8fromString', (t) => testFromString(t, dataSmall))
})

const skipLarge =
  process.env.EXODUS_TEST_PLATFORM === 'quickjs' ||
  process.env.EXODUS_TEST_PLATFORM === 'xs' ||
  process.env.EXODUS_TEST_PLATFORM === 'engine262'
describe('large', { skip: skipLarge }, async () => {
  const gzipped = readFileSync(path.join(import.meta.dirname, 'data.json.gz'))
  const dataLarge = JSON.parse(utf8toString(await gunzip(gzipped)))
  for (const entry of dataLarge) entry.bytes = encodeLatin1(entry.encoded)
  test('utf8toString', (t) => testToString(t, dataLarge))
  test('utf8fromString', (t) => testFromString(t, dataLarge))
})
