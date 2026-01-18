Buffer.TYPED_ARRAY_SUPPORT = true
delete Uint8Array.prototype.toBase64
delete Uint8Array.fromBase64
require('./base64.test.js')
