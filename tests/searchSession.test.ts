import { describe, it, expect } from 'vitest'
import { SearchSession } from '../src/logic/searchSession'

describe('SearchSession', () => {
  it('progresses linearly and clamps at completion', () => {
    const s = new SearchSession(4)
    expect(s.progress()).toBe(0)
    s.tick(2)
    expect(s.progress()).toBeCloseTo(0.5)
    expect(s.isComplete()).toBe(false)
    s.tick(2)
    expect(s.isComplete()).toBe(true)
    expect(s.progress()).toBe(1)
    s.tick(99)
    expect(s.progress()).toBe(1)
  })

  it('keeps 60% of progress on release', () => {
    const s = new SearchSession(4)
    s.tick(2)
    s.release()
    expect(s.progress()).toBeCloseTo(0.3)
  })

  it('wipes progress when interrupted', () => {
    const s = new SearchSession(4)
    s.tick(2)
    s.interrupt()
    expect(s.progress()).toBe(0)
  })

  it('is silent before starting and noisy while searching', () => {
    const s = new SearchSession(4)
    expect(s.noise()).toBe(0)
    s.tick(2)
    expect(s.noise()).toBeCloseTo(0.5)
  })
})
