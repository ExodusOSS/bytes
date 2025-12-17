import { toHex } from '@exodus/bytes/hex.js'

export const toBigInt = (a) => BigInt('0x' + (toHex(a) || '0'))
