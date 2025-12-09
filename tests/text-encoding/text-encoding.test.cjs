const { TextDecoder, TextEncoder } = require('@exodus/bytes/text-encoding.js')
Object.assign(globalThis, { TextDecoder, TextEncoder })

require('../wpt/loader.cjs')
globalThis.assert_throws = globalThis.assert_throws_js

// From https://github.com/inexorabletash/text-encoding/tree/master/test

require('./test-utf.js')
require('./test-misc.js')
