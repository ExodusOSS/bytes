export function assert(x, msg) {
  if (!x) throw new Error(msg || 'Assertion failed')
}

export function assertUint8(arr) {
  assert(arr instanceof Uint8Array, 'Should be an instance of Uint8Array / Buffer')
}
