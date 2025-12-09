// from https://github.com/cryptocoinjs/bs58/tree/master/test

import { fromBase58 as decode, toBase58 as encode } from '@exodus/bytes/base58.js'
import tape from '@exodus/test/tape'
import fixtures from './fixtures.cjs'

const { valid, invalid } = fixtures

valid.forEach(function (f) {
  tape('can encode ' + f.hex, function (t) {
    const actual = encode(Buffer.from(f.hex, 'hex'))
    t.equal(actual, f.string)
    t.end()
  })
})

valid.forEach(function (f) {
  tape('can decode ' + f.string, function (t) {
    const actual = Buffer.from(decode(f.string)).toString('hex')
    t.same(actual, f.hex)
    t.end()
  })
})

invalid.forEach(function (f) {
  tape('decode throws on ' + f.description, function (t) {
    t.throws(function () {
      decode(f.string)
    }, /^SyntaxError: Invalid character in base58 input$/)
    t.end()
  })
})
