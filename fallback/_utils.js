const { Buffer, TextEncoder, TextDecoder } = globalThis
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
const nativeEncoder = isNative(TextEncoder) ? new TextEncoder() : null
const nativeDecoder = isNative(TextDecoder) ? new TextDecoder('utf8', { ignoreBOM: true }) : null
const nativeBuffer = haveNativeBuffer ? Buffer : null
const isHermes = Boolean(globalThis.HermesInternal)

// Actually windows-1252, compatible with ascii and latin1 decoding
// Beware that on non-latin1, i.e. on windows-1252, this is broken in ~all Node.js versions released
// in 2025 due to a regression, so we call it Latin1 as it's usable only for that
const nativeDecoderLatin1 = isNative(TextDecoder)
  ? new TextDecoder('latin1', { ignoreBOM: true })
  : null

export { nativeEncoder, nativeDecoder, nativeDecoderLatin1, nativeBuffer, isHermes }
