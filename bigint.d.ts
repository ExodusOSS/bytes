/**
 * Utilities for converting between BigInt and Uint8Array.
 *
 * ```js
 * import { fromBigInt, toBigInt } from '@exodus/bytes/bigint.js'
 * ```
 *
 * @module @exodus/bytes/bigint.js
 */

/// <reference types="node" />

import type { OutputFormat, Uint8ArrayBuffer } from './array.js';

/**
 * Options for converting BigInt to bytes
 */
export interface FromBigIntOptions {
  /** The length in bytes of the output array */
  length: number;
  /** Output format (default: 'uint8') */
  format?: OutputFormat;
}

/**
 * Convert a BigInt to a Uint8Array or Buffer
 *
 * The BigInt is converted to a hex string and then padded to the specified length.
 * The output bytes are in big-endian format.
 * Throws if the BigInt is negative or cannot fit into the specified length.
 *
 * @param x - The BigInt to convert (must be non-negative)
 * @param options - Conversion options
 * @returns The converted bytes in big-endian format
 */
export function fromBigInt(x: bigint, options: { length: number; format?: 'uint8' }): Uint8ArrayBuffer;
export function fromBigInt(x: bigint, options: { length: number; format: 'buffer' }): Buffer;
export function fromBigInt(x: bigint, options: FromBigIntOptions): Uint8ArrayBuffer | Buffer;

/**
 * Convert a Uint8Array or Buffer to a BigInt
 *
 * The bytes are interpreted as a big-endian unsigned integer.
 *
 * @param a - The bytes to convert
 * @returns The BigInt representation
 */
export function toBigInt(a: ArrayBufferView): bigint;
