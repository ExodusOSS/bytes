import { decodePartAddition as decodePart } from './platform.native.js'

export const nativeBuffer = null
export const isHermes = false
export const isDeno = false
export const nativeEncoder = /* @__PURE__ */ (() => new TextEncoder())()
export const nativeDecoder = /* @__PURE__ */ (() => new TextDecoder('utf-8', { ignoreBOM: true }))()
export const nativeDecoderLatin1 = /* @__PURE__ */ (() =>
  new TextDecoder('latin1', { ignoreBOM: true }))()

// Block Firefox < 146 specifically from using native hex/base64, as it's very slow there
// Refs: https://bugzilla.mozilla.org/show_bug.cgi?id=1994067 (and linked issues), fixed in 146
// Before that, all versions of Firefox >= 133 are slow
// TODO: this could be removed when < 146 usage diminishes (note ESR)
// We do not worry about false-negatives here but worry about false-positives!
function shouldSkipBuiltins() {
  const g = globalThis
  // First, attempt to exclude as many things as we can using trivial checks, just in case, and to not hit ua
  if (!g.window || g.chrome || !g.navigator) return false
  try {
    // This was fixed specifically in Firefox 146. Other browser engines get this right
    new WeakSet().add(Symbol()) // eslint-disable-line symbol-description
    return false
  } catch {
    // In catch and not after in case if something too smart optimizes out code in try. False-negative is acceptable in that case
    if (!('onmozfullscreenerror' in g)) return false // Firefox has it (might remove in the future, but we don't care)
    return /firefox/i.test(g.navigator.userAgent || '') // as simple as we can
  }

  /* c8 ignore next */
  return false // eslint-disable-line no-unreachable
}

export const skipWeb = /* @__PURE__ */ shouldSkipBuiltins()

export { isLE } from './platform.native.js'

export function decode2string(arr, start, end, m) {
  if (end - start > 30_000) {
    // Limit concatenation to avoid excessive GC
    // Thresholds checked on Hermes for toHex
    const concat = []
    for (let i = start; i < end; ) {
      const step = i + 500
      const iNext = step > end ? end : step
      concat.push(decodePart(arr, i, iNext, m))
      i = iNext
    }

    const res = concat.join('')
    concat.length = 0
    return res
  }

  return decodePart(arr, start, end, m)
}
