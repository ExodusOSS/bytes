// Based on https://github.com/speakeasyjs/base32.js/blob/master/test/base32_test.js

import { describe, test as it } from 'node:test'
import assert from 'node:assert/strict'
import { toBase32, toBase32hex, fromBase32, fromBase32hex } from '@exodus/bytes/base32.js'
import fixtures from './fixtures.cjs'

describe('Decoder', function () {
  for (const subject of fixtures) {
    const test = Uint8Array.from(subject.buf)

    for (const str of subject.rfc4648) {
      it('should decode rfc4648 ' + str, function () {
        const strFixed = str.replaceAll('0', 'O') // we don't use charmap, it's not in spec
        assert.deepEqual(fromBase32(strFixed), test)
        assert.deepEqual(fromBase32(strFixed, { padding: false }), test)
      })
    }

    for (const str of subject.base32hex) {
      it('should decode base32hex ' + str, function () {
        assert.deepEqual(fromBase32hex(str), test)
        assert.deepEqual(fromBase32hex(str, { padding: false }), test)
      })
    }
  }
})

describe('Encoder', function () {
  for (const subject of fixtures) {
    const buf = Uint8Array.from(subject.buf)

    it('should encode rfc4648 ' + buf, function () {
      const test = subject.rfc4648[0]
      assert.equal(toBase32(buf), test)
      assert.equal(toBase32(buf, { padding: false }), test)
    })

    it('should encode base32hex ' + buf, function () {
      const test = subject.base32hex[0].toUpperCase()
      assert.equal(toBase32hex(buf), test)
      assert.equal(toBase32hex(buf, { padding: false }), test)
    })
  }
})
