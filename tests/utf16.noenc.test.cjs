if (process.env.EXODUS_TEST_IS_BROWSER || globalThis.Deno) {
  require('node:test').test.skip('Under browsers and Deno, TextDecoder is required')
} else {
  delete globalThis.TextEncoder
  delete globalThis.TextDecoder
  require('./utf16.test.js')
}
