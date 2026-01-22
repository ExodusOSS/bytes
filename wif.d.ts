/**
 * Wallet Import Format (WIF) encoding and decoding.
 *
 * Mostly matches npmjs.com/wif, but with extra checks + using our base58check.
 * Also no inconsistent behavior on Buffer/Uint8Array input.
 *
 * ```js
 * import { fromWifString, toWifString } from '@exodus/bytes/wif.js'
 * import { fromWifStringSync, toWifStringSync } from '@exodus/bytes/wif.js'
 * ```
 *
 * @module @exodus/bytes/wif.js
 */

/// <reference types="node" />

import type { Uint8ArrayBuffer } from './array.js';

/**
 * WIF (Wallet Import Format) data structure
 */
export interface Wif {
  /** Network version byte */
  version: number;
  /** 32-byte private key */
  privateKey: Uint8ArrayBuffer;
  /** Whether the key is compressed */
  compressed: boolean;
}

/**
 * Decode a WIF string to WIF data
 *
 * @param string - The WIF encoded string
 * @param version - Optional expected version byte to validate against
 * @returns The decoded WIF data
 * @throws Error if the WIF string is invalid or version doesn't match
 */
export function fromWifString(string: string, version?: number): Promise<Wif>;

/**
 * Decode a WIF string to WIF data (synchronous)
 *
 * @param string - The WIF encoded string
 * @param version - Optional expected version byte to validate against
 * @returns The decoded WIF data
 * @throws Error if the WIF string is invalid or version doesn't match
 */
export function fromWifStringSync(string: string, version?: number): Wif;

/**
 * Encode WIF data to a WIF string
 *
 * @param wif - The WIF data to encode
 * @returns The WIF encoded string
 * @throws Error if the WIF data is invalid
 */
export function toWifString(wif: Wif): Promise<string>;

/**
 * Encode WIF data to a WIF string (synchronous)
 *
 * @param wif - The WIF data to encode
 * @returns The WIF encoded string
 * @throws Error if the WIF data is invalid
 */
export function toWifStringSync(wif: Wif): string;
