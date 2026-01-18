if (process.browser) {
  const { test } = require('node:test')
  test.skip('Deno tests')
} else {
  if (!globalThis.Deno) globalThis.Deno = true
  require('./utf16.test.js')
}
