export class Table {
  #data = new Map()

  add(name, row) {
    if (!row) return
    this.#data.set(name, Math.round(row.rps).toLocaleString())
  }

  print(columns) {
    const selected = columns.filter((x) => this.#data.get(x))
    console.log(selected.join('\t'))
    console.log(selected.map((x) => this.#data.get(x)).join('\t'))
  }
}
