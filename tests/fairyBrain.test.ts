import { describe, it, expect } from 'vitest'
import { FairyBrain, FairyState } from '../src/logic/fairyBrain'

describe('FairyBrain', () => {
  it('starts patrolling and chases on sight', () => {
    const b = new FairyBrain(3, 2)
    expect(b.state()).toBe(FairyState.Patrol)
    b.tick(0.1, true, false)
    expect(b.state()).toBe(FairyState.Chase)
  })

  it('loses the player after the timeout, then returns to patrol', () => {
    const b = new FairyBrain(3, 2)
    b.tick(0.1, true, false)
    b.tick(2.9, false, false)
    expect(b.state()).toBe(FairyState.Chase)
    b.tick(0.2, false, false)
    expect(b.state()).toBe(FairyState.Lost)
    b.tick(2, false, false)
    expect(b.state()).toBe(FairyState.Patrol)
  })

  it('never loses a running player', () => {
    const b = new FairyBrain(3, 2)
    b.tick(0.1, true, false)
    b.tick(10, false, true)
    expect(b.state()).toBe(FairyState.Chase)
  })
})
