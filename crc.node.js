import { crc32 as native } from 'node:zlib'
import { assertU8 } from './fallback/_utils.js'
import { crc32Table } from './fallback/crc.js'

const T = crc32Table()
const [T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, Ta, Tb, Tc, Td, Te, Tf] = Array.from(
  { length: 16 },
  (_, k) => T.subarray(k * 256, k * 256 + 256)
)

// zlib.crc32 is a V8 fast API call since Node.js 24.9.0 (nodejs/node#59813)
const [major, minor] = (process.versions?.node || '0').split('.').map(Number)
const fastNative = major > 24 || (major === 24 && minor >= 9)

// Node.js x64 builds have SIMD crc32 disabled in zlib (nodejs/node#45268)
// arm64 builds use the hardware crc32x instruction
const NATIVE_MIN =
  !!globalThis.Deno || !!globalThis.Bun ? 0 : process.arch === 'arm64' ? (fastNative ? 0 : 64) : 256

export function crc32(x) {
  assertU8(x)
  const n = x.length
  if (n >= NATIVE_MIN) return native(x)
  let c = -1
  let i = 0
  for (const end = n - 15; i < end; i += 16) {
    // prettier-ignore
    c =
      Tf[(x[i] ^ c) & 0xff] ^ Te[(x[i + 1] ^ (c >>> 8)) & 0xff] ^
      Td[(x[i + 2] ^ (c >>> 16)) & 0xff] ^ Tc[x[i + 3] ^ (c >>> 24)] ^
      Tb[x[i + 4]] ^ Ta[x[i + 5]] ^ T9[x[i + 6]] ^ T8[x[i + 7]] ^
      T7[x[i + 8]] ^ T6[x[i + 9]] ^ T5[x[i + 10]] ^ T4[x[i + 11]] ^
      T3[x[i + 12]] ^ T2[x[i + 13]] ^ T1[x[i + 14]] ^ T0[x[i + 15]]
  }

  for (let j = i; j < n; j++) c = T0[(c ^ x[j]) & 0xff] ^ (c >>> 8)
  return ~c >>> 0
}
