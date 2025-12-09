export const multibyteSupported = () => false

export function multibyteDecoder() {
  throw new RangeError('Unsupported encoding')
}
