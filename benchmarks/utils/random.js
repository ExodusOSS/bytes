const seed = crypto.getRandomValues(new Uint8Array(5 * 1024))

export const bufs = []

const N = 3000

for (let i = 0; i < N; i++) {
  bufs.push(seed.subarray(Math.floor(Math.random() * 100)).map((x, j) => x + i * j))
}
