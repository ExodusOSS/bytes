import { isHermes } from './platform.js'

export function crc32Table() {
  const T = new (isHermes ? Uint32Array : Int32Array)(16 * 256) // Signed to fit int32 on read

  for (let n = 0; n < 256; n++) {
    let c = n
    for (let i = 0; i < 8; i++) c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1
    T[n] = c
  }

  for (let n = 0; n < 256; n++) {
    let v = T[n]
    for (let c = 256 + n; c < T.length; c += 256) v = T[c] = (v >>> 8) ^ T[v & 0xff]
  }

  return T
}
