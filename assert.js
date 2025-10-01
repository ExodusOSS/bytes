export function assert(x, msg) {
  if (!x) throw new Error(msg || 'Assertion failed')
}

export function assertEmptyRest(rest) {
  if (Object.keys(rest).length > 0) throw new TypeError('Unexpected extra options')
}

// eslint-disable-next-line sonarjs/no-nested-template-literals
const makeMessage = (name, extra) => `Expected${name ? ` ${name} to be` : ''} an Uint8Array${extra}`

const TypedArray = Object.getPrototypeOf(Uint8Array)

export function assertTypedArray(arr) {
  if (arr instanceof TypedArray) return
  throw new TypeError('Expected a TypedArray instance')
}

export function assertUint8(arr, { name, length, ...rest } = {}) {
  assertEmptyRest(rest)
  if (arr instanceof Uint8Array && (length === undefined || arr.length === length)) return
  throw new TypeError(makeMessage(name, length === undefined ? '' : ` of size ${Number(length)}`))
}
