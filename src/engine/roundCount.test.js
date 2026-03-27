import { describe, it, expect } from 'vitest'
import { recommendedRounds, defaultRounds } from './roundCount'

describe('recommendedRounds', () => {
  it.each([
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [16, 4],
    [32, 5],
    [64, 6],
    [128, 7],
    [256, 8],
  ])('returns %i rounds for %i players', (players, expected) => {
    expect(recommendedRounds(players)).toBe(expected)
  })

  it('returns 0 for fewer than 2 players', () => {
    expect(recommendedRounds(1)).toBe(0)
    expect(recommendedRounds(0)).toBe(0)
  })
})

describe('defaultRounds', () => {
  it('caps at 3 for large events', () => {
    expect(defaultRounds(8)).toBe(3)
    expect(defaultRounds(16)).toBe(3)
    expect(defaultRounds(256)).toBe(3)
  })

  it('uses recommended when under 3', () => {
    expect(defaultRounds(2)).toBe(1)
    expect(defaultRounds(3)).toBe(2)
    expect(defaultRounds(4)).toBe(2)
  })

  it('returns 3 for 5-8 players', () => {
    expect(defaultRounds(5)).toBe(3)
    expect(defaultRounds(6)).toBe(3)
    expect(defaultRounds(7)).toBe(3)
    expect(defaultRounds(8)).toBe(3)
  })
})
