if (process.env.EXODUS_TEST_IS_BROWSER) {
  require('node:test').test.skip('Under browsers, TextEncoder / TextDecoder is required')
} else {
  delete globalThis.TextEncoder
  delete globalThis.TextDecoder
  require('./utf8.lib.test.js')
}
