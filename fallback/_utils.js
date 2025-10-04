const { Buffer, TextEncoder, TextDecoder } = globalThis
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
export const nativeEncoder = isNative(TextEncoder) ? new TextEncoder() : null
export const nativeDecoder = isNative(TextDecoder) ? new TextDecoder() : null
