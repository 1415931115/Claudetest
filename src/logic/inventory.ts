export const COLS = 8
export const ROWS = 6

export interface ItemSize {
  w: number
  h: number
}

export interface Cell {
  x: number
  y: number
}

interface PlacedItem {
  size: ItemSize
  value: number
  cell: Cell
}

function key(x: number, y: number): string {
  return `${x},${y}`
}

export class Inventory {
  private readonly items = new Map<number, PlacedItem>()
  private readonly occupied = new Map<string, number>()
  private nextId = 1

  canPlace(size: ItemSize, cell: Cell): boolean {
    if (size.w <= 0 || size.h <= 0) return false
    if (cell.x < 0 || cell.y < 0) return false
    if (cell.x + size.w > COLS || cell.y + size.h > ROWS) return false
    for (let y = cell.y; y < cell.y + size.h; y++) {
      for (let x = cell.x; x < cell.x + size.w; x++) {
        if (this.occupied.has(key(x, y))) return false
      }
    }
    return true
  }

  place(size: ItemSize, value: number, cell: Cell): boolean {
    if (!this.canPlace(size, cell)) return false
    const id = this.nextId++
    this.items.set(id, { size, value, cell })
    for (let y = cell.y; y < cell.y + size.h; y++) {
      for (let x = cell.x; x < cell.x + size.w; x++) {
        this.occupied.set(key(x, y), id)
      }
    }
    return true
  }

  removeAt(cell: Cell): number {
    const id = this.occupied.get(key(cell.x, cell.y))
    if (id === undefined) return -1
    const item = this.items.get(id)
    if (item === undefined) return -1
    for (let y = item.cell.y; y < item.cell.y + item.size.h; y++) {
      for (let x = item.cell.x; x < item.cell.x + item.size.w; x++) {
        this.occupied.delete(key(x, y))
      }
    }
    this.items.delete(id)
    return item.value
  }

  totalValue(): number {
    let total = 0
    for (const item of this.items.values()) total += item.value
    return total
  }

  occupiedCells(): number {
    return this.occupied.size
  }
}
