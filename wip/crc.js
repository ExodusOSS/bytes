import { assertUint8 } from '../assert.js'

export function crc32(arg) {
  assertUint8(arg)
  throw new Error('Unimplemented')
}

export function crc32c(arg) {
  assertUint8(arg)
  throw new Error('Unimplemented')
}

// from https://www.npmjs.com/package/crc but without import 'buffer'
export function crc16xmodem(arg) {
  assertUint8(arg)

  let crc = 0
  for (const byte of arg) {
    let code = (crc >>> 8) & 0xff
    code ^= byte & 0xff
    code ^= code >>> 4
    crc = (crc << 8) & 0xff_ff
    crc ^= code
    code = (code << 5) & 0xff_ff
    crc ^= code
    code = (code << 7) & 0xff_ff
    crc ^= code
  }

  return crc // always unsigned as it is & 0xffff
}
