delete globalThis.TextDecoder
delete String.prototype.isWellFormed
delete String.prototype.toWellFormed

if (globalThis.HermesInternal) {
  // Test non-Hermes path on Hermes
  delete globalThis.HermesInternal
} else {
  // And Hermes path on non-Hermes
  globalThis.HermesInternal = true
}

require('./utf8.lib.test.js')
