import { assert } from './assert.js'

const _0n = BigInt(0)

// From a non-negative hex string, treats empty string as 0
export function fromHex(s) {
  assert(typeof s === 'string', 'Input should be a string')
  assert(!/[^0-9a-f]/iu.test(s), 'Invalid character in hex input')
  return BigInt('0x' + (s || '0'))
}

// TODO: should we return an empty string for 0n?
// Returns an even-sized hex, returns '00' for 0n
export function toHex(x) {
  assert(typeof x === 'bigint' || Number.isSafeInteger(x), 'Should be a bigint or a safe integer')
  assert(x >= 0, 'Should be non-negative') // >= is fine between bigint and numbers
  const hex = x.toString(16)
  return hex.length % 2 !== 0 ? '0' + hex : hex
}

// TODO: should we return an empty buffer for 0n?
// Returns [0] for 0n
export const toBuffer = (x) => Buffer.from(toHex(x), 'hex') // typechecks

export function toUint8(x) {
  const buf = toBuffer(x) // typechecks
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength) // zero-copy
}

export function fromUint8(a) {
  assert(a instanceof Uint8Array, 'Should be an instance of Uint8Array / Buffer')
  const buf = Buffer.isBuffer(a) ? a : Buffer.from(a.buffer, a.byteOffset, a.byteLength) // zero-copy
  return BigInt('0x' + buf.toString('hex')
}

export function parse(s, {
  allowNegative: false,
  allowStrings: false,
  allowBuffers: false,
  allowArrays: false,
} = {}) {
  let x
  switch (typeof s) {
    case 'string':
      assert(allowStrings, 'String input is disallowed by allowStrings option')
      switch (allowStrings) {
        case 10:
          assert(/^-?[0-9]+$/u.test(s), 'Invalid character in decimal string input')
          x = BigInt(s)
          break
        case 16:
          // this allows negative hex strings on allowNegative=true and allowStrings=16 combination!
          x = allowNegative && s[0] === '-' ? 0n - fromHex(s.slice(1)) : fromHex(s)
          break
        default:
          assert(false, 'Invalid allowStrings value, should be 10 (decimal) or 16 (hex)')
      }
      break
    case 'bigint':
      x = s
      break
    case 'number':
      assert(Number.isSafeInteger(s), 'Should be a safe integer')
      x = BigInt(s)
      break
    case 'object':
      if (Array.isArray(s)) {
        assert(allowArrays, 'Uint8Array / Buffer input disallowed by allowBuffer option')
        const buf = Buffer.from(s)
        assert(buf.every((c, i) => s[i] === c), 'Array should contain only bytes (0-255)')
        x = fromBuffer(buf)
      } else if (s instanceof Uint8Array) {    
        assert(allowBuffers, 'Uint8Array / Buffer input disallowed by allowBuffer option')
        x = fromBuffer(s)
      } else {
        throw new Error('Unsupported object')
      }
      break
    default:
      throw new Error('Unsupported type')
  if (!allowNegative) assert(x >= 0)
  return x
}

export const sum(arr, parseOpts) => [...arr].reduce((a, c) => a + parse(c, parseOpts), _0n)
