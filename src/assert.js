export function assert(x, msg) {
  if (!x) throw new Error(msg || 'Assertion failed')
}
