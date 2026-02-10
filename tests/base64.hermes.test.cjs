Buffer.TYPED_ARRAY_SUPPORT = true
if (!process.env.EXODUS_TEST_IS_BROWSER) delete globalThis.TextDecoder
delete Uint8Array.prototype.toBase64
delete Uint8Array.fromBase64

if (globalThis.HermesInternal) {
  // Test non-Hermes path on Hermes
  delete globalThis.HermesInternal
} else {
  // And Hermes path on non-Hermes
  globalThis.HermesInternal = true
}

require('./base64.test.js')
