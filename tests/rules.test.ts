import { describe, it, expect } from 'vitest'
import { noiseRadius, canChangeLamp, shouldSimulate } from '../src/logic/rules'

describe('noiseRadius', () => {
  it('is silent when standing still', () => {
    expect(noiseRadius(0, false)).toBe(0)
  })

  it('is quiet when crouch-walking', () => {
    expect(noiseRadius(2.0, false)).toBe(2)
  })

  it('carries further when walking', () => {
    expect(noiseRadius(3.4, false)).toBe(6)
  })

  it('carries furthest when running', () => {
    expect(noiseRadius(5.2, false)).toBe(16)
  })

  it('is audible while searching even when standing still', () => {
    expect(noiseRadius(0, true)).toBe(10)
  })
})

describe('canChangeLamp', () => {
  it('allows changing the lamp when not searching', () => {
    expect(canChangeLamp(false)).toBe(true)
  })

  it('blocks changing the lamp while nailed in place searching', () => {
    expect(canChangeLamp(true)).toBe(false)
  })
})

describe('shouldSimulate', () => {
  it('runs the world while the pointer is locked', () => {
    expect(shouldSimulate(true)).toBe(true)
  })

  it('freezes the world when the pointer lock is lost', () => {
    expect(shouldSimulate(false)).toBe(false)
  })
})
