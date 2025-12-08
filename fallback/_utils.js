const { Buffer, TextEncoder, TextDecoder } = globalThis
const haveNativeBuffer = Buffer && !Buffer.TYPED_ARRAY_SUPPORT
const isNative = (x) => x && (haveNativeBuffer || `${x}`.includes('[native code]')) // we consider Node.js TextDecoder/TextEncoder native
export const nativeEncoder = isNative(TextEncoder) ? new TextEncoder() : null
export const nativeDecoder = isNative(TextDecoder)
  ? new TextDecoder('utf8', { ignoreBOM: true })
  : null
export const nativeBuffer = haveNativeBuffer ? Buffer : null
export const isHermes = Boolean(globalThis.HermesInternal)

// Actually windows-1252, compatible with ascii and latin1 decoding
// Beware that on non-latin1, i.e. on windows-1252, this is broken in ~all Node.js versions released
// in 2025 due to a regression, so we call it Latin1 as it's usable only for that
export const nativeDecoderLatin1 = isNative(TextDecoder)
  ? new TextDecoder('latin1', { ignoreBOM: true })
  : null

// Block Firefox < 146 specifically from using native hex/base64, as it's very slow there
// Refs: https://bugzilla.mozilla.org/show_bug.cgi?id=1994067 (and linked issues), fixed in 146
// Before that, all versions of Firefox >= 133 are slow
// TODO: this could be removed when < 146 usage diminishes (note ESR)
// We do not worry about false-negatives here but worry about false-positives!
function shouldSkipBuiltins() {
  const g = globalThis
  // First, attempt to exclude as many things as we can using trivial checks, just in case, and to not hit ua
  if (haveNativeBuffer || isHermes || !g.window || g.chrome || !g.navigator) return false
  try {
    // This was fixed specifically in Firefox 146. Other engines except Hermes (already returned) get this right
    new WeakSet().add(Symbol()) // eslint-disable-line symbol-description
    return false
  } catch {
    // In catch and not after in case if something too smart optimizes out code in try. False-negative is acceptable in that case
    if (!('onmozfullscreenerror' in g)) return false // Firefox has it (might remove in the future, but we don't care)
    return /firefox/i.test(g.navigator.userAgent || '') // as simple as we can
  }

  return false // eslint-disable-line no-unreachable
}

export const skipWeb = shouldSkipBuiltins()
