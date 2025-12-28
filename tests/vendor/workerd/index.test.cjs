const {
  TextDecoder,
  TextEncoder,
  TextDecoderStream,
  TextEncoderStream,
} = require('@exodus/bytes/encoding.js')
const { test, describe } = require('node:test')

Object.assign(globalThis, { TextDecoder, TextEncoder, TextDecoderStream, TextEncoderStream })

// TextDecoderStream / TextEncoderStream implementations expect Streams to be present
if (!globalThis.ReadableStream) {
  const { ReadableStream, WritableStream, TransformStream } = require('web-streams-polyfill')
  Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream })
}

// Older but supported Node.js versions don't have Float16Array which is used in some tests
if (!globalThis.Float16Array) {
  const { Float16Array } = require('@petamoriken/float16')
  Object.assign(globalThis, { Float16Array })
}

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
