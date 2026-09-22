import { assertU8 } from './fallback/_utils.js'
import { crc32Table } from './fallback/crc.js'
import { isHermes, isLE } from './fallback/platform.js'

const T = crc32Table()

const [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, Ta, Tb, Tc, Td, Te, Tf] = Array.from(
  { length: 16 },
  (_, k) => T.subarray(k * 256, k * 256 + 256)
)

export function crc32(x) {
  assertU8(x)
  let c = -1
  let i = 0
  const n = x.length

  if (isLE && n > 1024) {
    const pre = (4 - (x.byteOffset & 3)) & 3
    for (; i < pre; i++) c = T0[(c ^ x[i]) & 0xff] ^ (c >>> 8)
    const words = (n - i) >>> 2
    const W = new (isHermes ? Uint32Array : Int32Array)(x.buffer, x.byteOffset + i, words)
    let j = 0
    for (const end = words - 3; j < end; j += 4) {
      const a = W[j] ^ c
      const b = W[j + 1]
      const d = W[j + 2]
      const e = W[j + 3]
      // prettier-ignore
      c =
        T[0xf_00 + (a & 0xff)] ^ T[0xe_00 + ((a >>> 8) & 0xff)] ^ T[0xd_00 + ((a >>> 16) & 0xff)] ^ T[0xc_00 + (a >>> 24)] ^
        T[0xb_00 + (b & 0xff)] ^ T[0xa_00 + ((b >>> 8) & 0xff)] ^ T[0x9_00 + ((b >>> 16) & 0xff)] ^ T[0x8_00 + (b >>> 24)] ^
        T[0x7_00 + (d & 0xff)] ^ T[0x6_00 + ((d >>> 8) & 0xff)] ^ T[0x5_00 + ((d >>> 16) & 0xff)] ^ T[0x4_00 + (d >>> 24)] ^
        T[0x3_00 + (e & 0xff)] ^ T[0x2_00 + ((e >>> 8) & 0xff)] ^ T[0x1_00 + ((e >>> 16) & 0xff)] ^ T[e >>> 24]
    }

    i += j * 4 // not << 2, so that inputs >= 2 GiB stay correct
  } else {
    for (const end = n - 15; i < end; i += 16) {
      // prettier-ignore
      c =
        Tf[(x[i] ^ c) & 0xff] ^ Te[(x[i + 1] ^ (c >>> 8)) & 0xff] ^
        Td[(x[i + 2] ^ (c >>> 16)) & 0xff] ^ Tc[x[i + 3] ^ (c >>> 24)] ^
        Tb[x[i + 4]] ^ Ta[x[i + 5]] ^ T9[x[i + 6]] ^ T8[x[i + 7]] ^
        T7[x[i + 8]] ^ T6[x[i + 9]] ^ T5[x[i + 10]] ^ T4[x[i + 11]] ^
        T3[x[i + 12]] ^ T2[x[i + 13]] ^ T1[x[i + 14]] ^ T0[x[i + 15]]
    }
  }

  for (let k = i; k < n; k++) c = T0[(c ^ x[k]) & 0xff] ^ (c >>> 8)
  return ~c >>> 0
}
