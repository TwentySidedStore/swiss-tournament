import { describe, it, expect } from 'vitest'
import { generateRound1Pairings, generateRoundNPairings, buildFacedMap, BYE_PHANTOM } from './pairing'

function makePlayer(id, name) {
  return { id, name }
}

function makeMatch(id, p1, p2, games, type = 'normal') {
  return { id, player1Id: p1, player2Id: p2, type, games }
}

function makeByeMatch(id, playerId) {
  return makeMatch(id, playerId, null, { p1Wins: 2, p2Wins: 0, draws: 0 }, 'bye')
}

function makeRound(num, matches, locked = true) {
  return { roundNumber: num, matches, locked }
}

// ── generateRound1Pairings ────────────────────────────────────

describe('generateRound1Pairings', () => {
  it('pairs even number of players with no bye', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C'), makePlayer(4, 'D')]
    const { matches, nextMatchId } = generateRound1Pairings(players, 1)
    expect(matches).toHaveLength(2)
    expect(matches.every((m) => m.type === 'normal')).toBe(true)
    expect(nextMatchId).toBe(3)
  })

  it('creates a bye match for odd players', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C')]
    const { matches } = generateRound1Pairings(players, 1)
    expect(matches).toHaveLength(2) // 1 normal + 1 bye
    const byeMatch = matches.find((m) => m.type === 'bye')
    expect(byeMatch).toBeDefined()
    expect(byeMatch.player2Id).toBeNull()
    expect(byeMatch.games).toEqual({ p1Wins: 2, p2Wins: 0, draws: 0 })
  })

  it('handles 2 players', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B')]
    const { matches } = generateRound1Pairings(players, 1)
    expect(matches).toHaveLength(1)
    expect(matches[0].type).toBe('normal')
  })

  it('assigns sequential match IDs starting from startMatchId', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C'), makePlayer(4, 'D')]
    const { matches, nextMatchId } = generateRound1Pairings(players, 10)
    expect(matches[0].id).toBe(10)
    expect(matches[1].id).toBe(11)
    expect(nextMatchId).toBe(12)
  })

  it('includes all players exactly once', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C'), makePlayer(4, 'D'), makePlayer(5, 'E'), makePlayer(6, 'F')]
    const { matches } = generateRound1Pairings(players, 1)
    const allPlayerIds = new Set()
    for (const m of matches) {
      allPlayerIds.add(m.player1Id)
      if (m.player2Id) allPlayerIds.add(m.player2Id)
    }
    expect(allPlayerIds.size).toBe(6)
  })
})

// ── buildFacedMap ─────────────────────────────────────────────

describe('buildFacedMap', () => {
  it('maps opponents for normal matches', () => {
    const rounds = [
      makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })]),
    ]
    const faced = buildFacedMap(rounds)
    expect(faced.get(1).has(2)).toBe(true)
    expect(faced.get(2).has(1)).toBe(true)
  })

  it('maps BYE_PHANTOM for bye matches', () => {
    const rounds = [
      makeRound(1, [makeByeMatch(1, 3)]),
    ]
    const faced = buildFacedMap(rounds)
    expect(faced.get(3).has(BYE_PHANTOM.id)).toBe(true)
  })

  it('does not map opponents for assigned losses', () => {
    const rounds = [
      makeRound(1, [makeMatch(1, 1, null, { p1Wins: 0, p2Wins: 2, draws: 0 }, 'assigned_loss')]),
    ]
    const faced = buildFacedMap(rounds)
    expect(faced.get(1)?.size ?? 0).toBe(0)
  })
})

// ── generateRoundNPairings ────────────────────────────────────

describe('generateRoundNPairings', () => {
  it('produces valid pairings with no rematches for 4 players round 2', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C'), makePlayer(4, 'D')]
    const r1 = makeRound(1, [
      makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeMatch(2, 3, 4, { p1Wins: 2, p2Wins: 0, draws: 0 }),
    ])
    const { matches } = generateRoundNPairings(players, [r1], 10)
    expect(matches).toHaveLength(2)

    // No rematches
    const faced = buildFacedMap([r1])
    for (const m of matches) {
      if (m.type === 'normal') {
        expect(faced.get(m.player1Id)?.has(m.player2Id) ?? false).toBe(false)
      }
    }
  })

  it('assigns bye to lowest-pointed player without bye for 5 players round 2', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C'), makePlayer(4, 'D'), makePlayer(5, 'E')]
    // R1: A beats B, C beats D, E gets bye
    const r1 = makeRound(1, [
      makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeMatch(2, 3, 4, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeByeMatch(3, 5),
    ])
    const { matches } = generateRoundNPairings(players, [r1], 10)

    // E already had a bye, so bye should go to B or D (0 points, no bye yet)
    const byeMatch = matches.find((m) => m.type === 'bye')
    expect(byeMatch).toBeDefined()
    expect([2, 4]).toContain(byeMatch.player1Id)
  })

  it('floats bye up when all lowest players have had byes', () => {
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C'), makePlayer(4, 'D'), makePlayer(5, 'E')]
    // R1: A beats B, C beats D, E gets bye
    // R2: A beats C, E beats B, D gets bye
    const r1 = makeRound(1, [
      makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeMatch(2, 3, 4, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeByeMatch(3, 5),
    ])
    const r2 = makeRound(2, [
      makeMatch(4, 1, 3, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeMatch(5, 5, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeByeMatch(6, 4),
    ])
    const { matches } = generateRoundNPairings(players, [r1, r2], 20)

    // D and E already had byes. The bye must go to someone who hasn't had one.
    const byeMatch = matches.find((m) => m.type === 'bye')
    expect(byeMatch).toBeDefined()
    // Bye recipient should NOT be D(4) or E(5) — they already had byes
    expect([4, 5]).not.toContain(byeMatch.player1Id)
  })

  it('handles backtracking when naive pairing fails', () => {
    // 4 players, after R1 where 1v2 and 3v4, round 2 must pair 1v3 or 1v4 (not 1v2 again)
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C'), makePlayer(4, 'D')]
    const r1 = makeRound(1, [
      makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeMatch(2, 3, 4, { p1Wins: 2, p2Wins: 0, draws: 0 }),
    ])
    const { matches } = generateRoundNPairings(players, [r1], 10)

    const faced = buildFacedMap([r1])
    for (const m of matches) {
      if (m.type === 'normal') {
        const alreadyFaced = faced.get(m.player1Id)?.has(m.player2Id) ?? false
        expect(alreadyFaced).toBe(false)
      }
    }
  })

  it('falls back to rematches if no valid pairing exists', () => {
    // 3 players, 2 rounds completed — everyone has played everyone
    // Round 3 must allow rematches
    const players = [makePlayer(1, 'A'), makePlayer(2, 'B'), makePlayer(3, 'C')]
    const r1 = makeRound(1, [
      makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeByeMatch(2, 3),
    ])
    const r2 = makeRound(2, [
      makeMatch(3, 3, 1, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      makeByeMatch(4, 2),
    ])
    // Now in round 3: A faced B and C. B faced A. C faced A.
    // With 3 players + bye, someone pairs with someone they've faced.
    const { matches } = generateRoundNPairings(players, [r1, r2], 10)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('handles 16 players without error', () => {
    const players = Array.from({ length: 16 }, (_, i) => makePlayer(i + 1, `P${i + 1}`))
    const r1Matches = []
    for (let i = 0; i < 16; i += 2) {
      r1Matches.push(makeMatch(i + 1, i + 1, i + 2, { p1Wins: 2, p2Wins: 0, draws: 0 }))
    }
    const r1 = makeRound(1, r1Matches)
    const { matches } = generateRoundNPairings(players, [r1], 100)
    expect(matches).toHaveLength(8)
    expect(matches.every((m) => m.type === 'normal')).toBe(true)
  })
})
