const { TextDecoder, TextEncoder } = require('@exodus/bytes/encoding.js')
const { test, describe } = require('node:test')

Object.assign(globalThis, { TextDecoder, TextEncoder })

function run(title, tests) {
  describe(title, () => {
    for (const [name, obj] of Object.entries(tests)) {
      test(name, async (t) => {
        t.assert.deepStrictEqual(Object.keys(obj), ['test'])
        obj.test()
      })
    }
  })
}

run('encoding', require('./api/encoding_test.js'))
