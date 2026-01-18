delete globalThis.TextEncoder
if (!globalThis.Deno) delete globalThis.TextDecoder // Deno path requires it
require('./utf16.test.js')
