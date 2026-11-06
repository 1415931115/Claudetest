import { describe, it, expect } from 'vitest'
import { Inventory } from '../src/logic/inventory'

describe('Inventory', () => {
  it('places an item in an empty bag', () => {
    const inv = new Inventory()
    expect(inv.place({ w: 2, h: 1 }, 10, { x: 0, y: 0 })).toBe(true)
    expect(inv.totalValue()).toBe(10)
    expect(inv.occupiedCells()).toBe(2)
  })

  it('refuses overlap, right overflow, and bottom overflow', () => {
    const inv = new Inventory()
    inv.place({ w: 2, h: 1 }, 10, { x: 0, y: 0 })
    expect(inv.canPlace({ w: 2, h: 1 }, { x: 1, y: 0 })).toBe(false)
    expect(inv.canPlace({ w: 2, h: 1 }, { x: 7, y: 0 })).toBe(false)
    expect(inv.canPlace({ w: 2, h: 2 }, { x: 0, y: 5 })).toBe(false)
  })

  it('accepts a single cell in the far corner', () => {
    const inv = new Inventory()
    expect(inv.canPlace({ w: 1, h: 1 }, { x: 7, y: 5 })).toBe(true)
  })

  it('returns value on removal and -1 on an empty cell', () => {
    const inv = new Inventory()
    inv.place({ w: 2, h: 1 }, 10, { x: 0, y: 0 })
    expect(inv.removeAt({ x: 0, y: 0 })).toBe(10)
    expect(inv.removeAt({ x: 0, y: 0 })).toBe(-1)
    expect(inv.totalValue()).toBe(0)
    expect(inv.occupiedCells()).toBe(0)
  })
})
