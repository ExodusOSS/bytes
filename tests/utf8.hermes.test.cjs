if (!process.env.EXODUS_TEST_IS_BROWSER) delete globalThis.TextDecoder
delete String.prototype.isWellFormed
delete String.prototype.toWellFormed

if (globalThis.HermesInternal) {
  // Test non-Hermes path on Hermes
  delete globalThis.HermesInternal
} else {
  // And Hermes path on non-Hermes
  globalThis.HermesInternal = true
}

if (process.env.EXODUS_TEST_PLATFORM === 'xs') {
  // https://github.com/Moddable-OpenSource/moddable/issues/1562
  // escape() path is used only on Hermes, not XS
  // this test cross-tests that the Hermes path logic works on all engines
  // but it doesn't on XS due to XS bug
  require('node:test').test.skip('Known bug on XS escape(), path not used')
} else {
  require('./utf8.lib.test.js')
}
