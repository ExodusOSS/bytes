/// <reference types="node" />

import type { OutputFormat, StrictUint8Array } from './array.js';

/**
 * Encodes a Uint8Array to a lowercase hex string
 * @param arr - The input bytes
 * @returns The hex encoded string
 */
export function toHex(arr: StrictUint8Array): string;

/**
 * Decodes a hex string to bytes
 * Unlike Buffer.from(), throws on invalid input
 * @param str - The hex encoded string (case-insensitive)
 * @param format - Output format (default: 'uint8')
 * @returns The decoded bytes
 */
export function fromHex(str: string, format?: 'uint8'): StrictUint8Array;
export function fromHex(str: string, format: 'buffer'): Buffer;
export function fromHex(str: string, format?: OutputFormat): StrictUint8Array | Buffer;

