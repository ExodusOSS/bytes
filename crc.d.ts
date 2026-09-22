/**
 * Implements crc32 from [IEEE 802.3](https://standards.ieee.org/ieee/802.3/10422/),
 * [ISO 3309](https://www.iso.org/standard/8561.html),
 * [ISO/IEC 13239:2002](https://www.iso.org/standard/37010.html),
 * and others.
 *
 * ```js
 * import { crc32 } from '@exodus/bytes/crc.js'
 * ```
 *
 * @module @exodus/bytes/crc.js
 */

/**
 * Calculate the CRC-32 of a `Uint8Array`, as an unsigned number.
 *
 * @param arr - The input bytes
 * @returns CRC-32 as an unsigned number from 0 to 2**32-1
 */
export function crc32(arr: Uint8Array): number;
