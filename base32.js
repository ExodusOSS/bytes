import { assert, assertEmptyRest } from './assert.js'
import { typedView } from './array.js'
import * as js from './fallback/base32.js'

// See https://datatracker.ietf.org/doc/html/rfc4648

// 8 chars per 5 bytes

export const toBase32 = (arr, { padding = false } = {}) => js.toBase32(arr, false, padding)
export const toBase32hex = (arr, { padding = false } = {}) => js.toBase32(arr, true, padding)

// By default, valid padding is accepted but not required
export const fromBase32 = (str, { format = 'uint8', padding = 'both', ...rest } = {}) =>
  fromBase32common(str, false, padding, format, rest)
export const fromBase32hex = (str, { format = 'uint8', padding = 'both', ...rest } = {}) =>
  fromBase32common(str, true, padding, format, rest)

function fromBase32common(str, isBase32Hex, padding, format, rest) {
  if (typeof str !== 'string') throw new TypeError('Input is not a string')
  assertEmptyRest(rest)

  const auto = padding === 'both' ? str.endsWith('=') : undefined
  if (padding === true || auto === true) {
    assert(str.length % 8 === 0, 'Invalid padded length')
    assert(str[str.length - 7] !== '=', 'Excessive padding') // no more than 6 = at the end
    const at = str.indexOf('=')
    if (at >= 0) assert(!/[^=]/iu.test(str.slice(at)), 'Invalid padding')
  } else if (padding === false || auto === false) {
    assert([0, 2, 4, 5, 7].includes(str.length % 8), 'Invalid base32 length')
    assert(!str.includes('='), 'Did not expect padding in base32 input')
  } else {
    throw new Error('Invalid padding option')
  }

  if (isBase32Hex) {
    // https://datatracker.ietf.org/doc/html/rfc4648#section-7
    if (/[^A-Z2-7=]/u.test(str)) throw new Error('Invalid character in base32hex input')
  } else {
    // https://datatracker.ietf.org/doc/html/rfc4648#section-6
    if (/[^0-9A-V=]/u.test(str)) throw new Error('Invalid character in base32 input')
  }

  const arr = js.fromBase32(str, isBase32Hex)

  if (arr.length % 5 !== 0) {
    // Check last chunk to be strict if it was incomplete
    const expected = js.toBase32(arr.subarray(-(arr.length % 5)), isBase32Hex, true)
    const actual =
      str.length % 8 === 0 ? str.slice(-8) : str.slice(-(str.length % 8)).padEnd(8, '=')
    if (expected !== actual) throw new Error('Invalid last chunk')
  }

  return typedView(arr, format)
}
