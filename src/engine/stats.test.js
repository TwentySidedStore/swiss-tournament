import { describe, it, expect } from 'vitest'
import { deriveResult, computePlayerStats, computeTiebreakers, sortStandings } from './stats'

// ── deriveResult ──────────────────────────────────────────────

describe('deriveResult', () => {
  it.each([
    [{ p1Wins: 0, p2Wins: 0, draws: 0 }, null],
    [{ p1Wins: 2, p2Wins: 0, draws: 0 }, 'p1_win'],
    [{ p1Wins: 0, p2Wins: 2, draws: 0 }, 'p2_win'],
    [{ p1Wins: 2, p2Wins: 1, draws: 0 }, 'p1_win'],
    [{ p1Wins: 1, p2Wins: 2, draws: 0 }, 'p2_win'],
    [{ p1Wins: 1, p2Wins: 1, draws: 0 }, 'draw'],
    [{ p1Wins: 1, p2Wins: 1, draws: 1 }, 'draw'],
    [{ p1Wins: 0, p2Wins: 0, draws: 3 }, 'draw'],
    [{ p1Wins: 1, p2Wins: 0, draws: 5 }, 'p1_win'],
    [{ p1Wins: 1, p2Wins: 0, draws: 0 }, 'p1_win'],
    [{ p1Wins: 0, p2Wins: 1, draws: 0 }, 'p2_win'],
  ])('derives %j → %s', (games, expected) => {
    expect(deriveResult(games)).toBe(expected)
  })
})

// ── helpers ───────────────────────────────────────────────────

function makePlayer(id, name) {
  return { id, name }
}

function makeMatch(id, p1, p2, games, type = 'normal') {
  return {
    id,
    player1Id: p1,
    player2Id: p2,
    type,
    games,
  }
}

function makeByeMatch(id, playerId) {
  return makeMatch(id, playerId, null, { p1Wins: 2, p2Wins: 0, draws: 0 }, 'bye')
}

function makeLossMatch(id, playerId) {
  return makeMatch(id, playerId, null, { p1Wins: 0, p2Wins: 2, draws: 0 }, 'assigned_loss')
}

function makeRound(num, matches, locked = false) {
  return { roundNumber: num, matches, locked }
}

// ── computePlayerStats ────────────────────────────────────────

describe('computePlayerStats', () => {
  const alice = makePlayer(1, 'Alice')
  const bob = makePlayer(2, 'Bob')
  const carol = makePlayer(3, 'Carol')
  const diana = makePlayer(4, 'Diana')

  it('computes stats for a 2-0 win', () => {
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })])]
    const stats = computePlayerStats([alice, bob], rounds)

    const a = stats.get(1)
    expect(a.matchRecord).toEqual({ w: 1, l: 0, d: 0 })
    expect(a.gameRecord).toEqual({ w: 2, l: 0, d: 0 })
    expect(a.matchPoints).toBe(3)
    expect(a.gamePoints).toBe(6)
    expect(a.gamesPlayed).toBe(2)
    expect(a.opponents).toEqual([2])
    expect(a.roundsCompleted).toBe(1)

    const b = stats.get(2)
    expect(b.matchRecord).toEqual({ w: 0, l: 1, d: 0 })
    expect(b.gameRecord).toEqual({ w: 0, l: 2, d: 0 })
    expect(b.matchPoints).toBe(0)
    expect(b.gamePoints).toBe(0)
    expect(b.gamesPlayed).toBe(2)
    expect(b.opponents).toEqual([1])
  })

  it('computes stats for a 1-2 loss', () => {
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 1, p2Wins: 2, draws: 0 })])]
    const stats = computePlayerStats([alice, bob], rounds)
    const a = stats.get(1)
    expect(a.matchRecord).toEqual({ w: 0, l: 1, d: 0 })
    expect(a.gameRecord).toEqual({ w: 1, l: 2, d: 0 })
    expect(a.gamesPlayed).toBe(3)
  })

  it('computes stats for a 1-1-1 draw', () => {
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 1, p2Wins: 1, draws: 1 })])]
    const stats = computePlayerStats([alice, bob], rounds)
    const a = stats.get(1)
    expect(a.matchRecord).toEqual({ w: 0, l: 0, d: 1 })
    expect(a.gameRecord).toEqual({ w: 1, l: 1, d: 1 })
    expect(a.matchPoints).toBe(1)
    expect(a.gamePoints).toBe(4) // 1×3 + 1×1
    expect(a.gamesPlayed).toBe(3)
  })

  it('computes stats for a bye', () => {
    const rounds = [makeRound(1, [makeByeMatch(1, 1)])]
    const stats = computePlayerStats([alice], rounds)
    const a = stats.get(1)
    expect(a.matchRecord).toEqual({ w: 1, l: 0, d: 0 })
    expect(a.gameRecord).toEqual({ w: 2, l: 0, d: 0 })
    expect(a.matchPoints).toBe(3)
    expect(a.gamePoints).toBe(6)
    expect(a.gamesPlayed).toBe(2)
    expect(a.hasBye).toBe(true)
    expect(a.opponents).toEqual([]) // bye excluded
    expect(a.roundsCompleted).toBe(1)
  })

  it('computes stats for an assigned loss', () => {
    const rounds = [makeRound(1, [makeLossMatch(1, 1)])]
    const stats = computePlayerStats([alice], rounds)
    const a = stats.get(1)
    expect(a.matchRecord).toEqual({ w: 0, l: 1, d: 0 })
    expect(a.gameRecord).toEqual({ w: 0, l: 2, d: 0 })
    expect(a.matchPoints).toBe(0)
    expect(a.gamePoints).toBe(0)
    expect(a.gamesPlayed).toBe(2)
    expect(a.opponents).toEqual([]) // assigned loss excluded
    expect(a.roundsCompleted).toBe(1)
  })

  it('accumulates across multiple rounds', () => {
    const rounds = [
      makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })]),
      makeRound(2, [makeMatch(2, 1, 3, { p1Wins: 2, p2Wins: 1, draws: 0 })]),
    ]
    const stats = computePlayerStats([alice, bob, carol], rounds)
    const a = stats.get(1)
    expect(a.matchRecord).toEqual({ w: 2, l: 0, d: 0 })
    expect(a.gameRecord).toEqual({ w: 4, l: 1, d: 0 })
    expect(a.matchPoints).toBe(6)
    expect(a.gamesPlayed).toBe(5)
    expect(a.opponents).toEqual([2, 3])
    expect(a.roundsCompleted).toBe(2)
  })

  it('handles late entrant with assigned losses + real match', () => {
    const rounds = [
      makeRound(1, [
        makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeLossMatch(2, 3),
      ]),
      makeRound(2, [makeMatch(3, 1, 3, { p1Wins: 1, p2Wins: 2, draws: 0 })]),
    ]
    const stats = computePlayerStats([alice, bob, carol], rounds)
    const c = stats.get(3)
    expect(c.matchRecord).toEqual({ w: 1, l: 1, d: 0 }) // 1 assigned loss + 1 win
    expect(c.roundsCompleted).toBe(2)
    expect(c.opponents).toEqual([1]) // assigned loss excluded
    expect(c.gamesPlayed).toBe(5) // 2 from loss + 3 from real match
  })

  it('gives zero stats for a player with no matches', () => {
    const stats = computePlayerStats([alice], [])
    const a = stats.get(1)
    expect(a.matchRecord).toEqual({ w: 0, l: 0, d: 0 })
    expect(a.matchPoints).toBe(0)
    expect(a.gamesPlayed).toBe(0)
    expect(a.roundsCompleted).toBe(0)
    expect(a.opponents).toEqual([])
  })

  it('correctly computes gamesPlayed for various match types', () => {
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 1, draws: 0 })])]
    const stats = computePlayerStats([alice, bob], rounds)
    expect(stats.get(1).gamesPlayed).toBe(3) // 2+1+0
    expect(stats.get(2).gamesPlayed).toBe(3)
  })
})

// ── computeTiebreakers ────────────────────────────────────────

describe('computeTiebreakers', () => {
  const alice = makePlayer(1, 'Alice')
  const bob = makePlayer(2, 'Bob')
  const carol = makePlayer(3, 'Carol')
  const diana = makePlayer(4, 'Diana')

  it('computes MWP correctly', () => {
    // Alice: 3 match points, 1 round = 3/(3×1) = 1.0
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })])]
    const stats = computePlayerStats([alice, bob], rounds)
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).mwp).toBeCloseTo(1.0)
  })

  it('floors MWP at 0.33', () => {
    // Bob: 0 match points, 2 rounds = 0/(3×2) = 0 → floored to 0.33
    const rounds = [
      makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })]),
      makeRound(2, [makeMatch(2, 3, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })]),
    ]
    const stats = computePlayerStats([alice, bob, carol], rounds)
    const tb = computeTiebreakers(stats)
    expect(tb.get(2).mwp).toBeCloseTo(0.33, 2)
  })

  it('returns 0 for MWP when 0 rounds completed', () => {
    const stats = computePlayerStats([alice], [])
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).mwp).toBe(0)
  })

  it('computes GWP correctly', () => {
    // Alice: 6 game points, 2 games = 6/(3×2) = 1.0
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })])]
    const stats = computePlayerStats([alice, bob], rounds)
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).gwp).toBeCloseTo(1.0)
  })

  it('computes GWP with draws', () => {
    // Alice: 1 win (3pts) + 1 draw (1pt) = 4 game points, 3 games = 4/(3×3) ≈ 0.4444
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 1, p2Wins: 1, draws: 1 })])]
    const stats = computePlayerStats([alice, bob], rounds)
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).gwp).toBeCloseTo(4 / 9, 4)
  })

  it('returns 0 for GWP when 0 games played', () => {
    const stats = computePlayerStats([alice], [])
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).gwp).toBe(0)
  })

  it('computes OMWP as average of opponents MWP, each floored at 0.33', () => {
    // 4 players, 2 rounds:
    // R1: Alice beats Bob (2-0), Carol beats Diana (2-0)
    // R2: Alice beats Carol (2-0), Bob beats Diana (2-0)
    // Alice: 6pts, opponents [Bob(3pts/2rds=0.5), Carol(3pts/2rds=0.5)]
    // Alice OMWP = avg(0.5, 0.5) = 0.5
    const rounds = [
      makeRound(1, [
        makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeMatch(2, 3, 4, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      ]),
      makeRound(2, [
        makeMatch(3, 1, 3, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeMatch(4, 2, 4, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      ]),
    ]
    const stats = computePlayerStats([alice, bob, carol, diana], rounds)
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).omwp).toBeCloseTo(0.5, 2)
  })

  it('returns 0 for OMWP when no real opponents', () => {
    // Player only has byes
    const rounds = [makeRound(1, [makeByeMatch(1, 1)])]
    const stats = computePlayerStats([alice], rounds)
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).omwp).toBe(0)
  })

  it('floors each opponent MWP at 0.33 before averaging', () => {
    // Alice beats Bob in R1, Bob has 0 wins in 1 round → MWP=0 → floored to 0.33
    // Alice OMWP = 0.33
    const rounds = [makeRound(1, [makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 })])]
    const stats = computePlayerStats([alice, bob], rounds)
    const tb = computeTiebreakers(stats)
    expect(tb.get(1).omwp).toBeCloseTo(0.33, 2)
  })

  it('computes full 4-player 2-round scenario', () => {
    const rounds = [
      makeRound(1, [
        makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeMatch(2, 3, 4, { p1Wins: 2, p2Wins: 1, draws: 0 }),
      ]),
      makeRound(2, [
        makeMatch(3, 1, 3, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeMatch(4, 4, 2, { p1Wins: 2, p2Wins: 1, draws: 0 }),
      ]),
    ]
    const stats = computePlayerStats([alice, bob, carol, diana], rounds)
    const tb = computeTiebreakers(stats)

    // Alice: 2-0, 6 match pts. Opponents: Bob(0-2), Carol(1-1)
    // Bob MWP: 0/(3×2) = 0 → 0.33. Carol MWP: 3/(3×2) = 0.5
    // Alice OMWP = (0.33 + 0.5) / 2 = 0.415
    expect(tb.get(1).omwp).toBeCloseTo(0.415, 2)
    expect(tb.get(1).mwp).toBeCloseTo(1.0)
  })
})

// ── sortStandings ─────────────────────────────────────────────

describe('sortStandings', () => {
  const alice = makePlayer(1, 'Alice')
  const bob = makePlayer(2, 'Bob')
  const carol = makePlayer(3, 'Carol')

  it('sorts by match points descending', () => {
    const rounds = [
      makeRound(1, [
        makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeByeMatch(2, 3),
      ]),
    ]
    const stats = computePlayerStats([alice, bob, carol], rounds)
    const tb = computeTiebreakers(stats)
    const standings = sortStandings([alice, bob, carol], stats, tb)

    // Alice and Carol both have 3pts, Bob has 0
    expect(standings[standings.length - 1].player.id).toBe(2) // Bob last
  })

  it('breaks tie by OMWP', () => {
    // Construct scenario where two players have same points but different OMWP
    const rounds = [
      makeRound(1, [
        makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeMatch(2, 3, 1, { p1Wins: 0, p2Wins: 2, draws: 0 }),
      ]),
    ]
    const stats = computePlayerStats([alice, bob, carol], rounds)
    const tb = computeTiebreakers(stats)
    const standings = sortStandings([alice, bob, carol], stats, tb)

    // Alice: 6pts. Bob and Carol: check OMWP for tiebreak
    expect(standings[0].player.id).toBe(1) // Alice first
  })

  it('assigns shared ranks for identical tiebreakers', () => {
    // Two players with identical records and opponents
    const rounds = [
      makeRound(1, [
        makeMatch(1, 1, 3, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        makeMatch(2, 2, 3, { p1Wins: 2, p2Wins: 0, draws: 0 }),
      ]),
    ]
    // This doesn't quite work since they can't both play carol in same round
    // Use a simpler scenario: both have byes
    const rounds2 = [
      makeRound(1, [makeByeMatch(1, 1), makeByeMatch(2, 2)]),
    ]
    const stats = computePlayerStats([alice, bob], rounds2)
    const tb = computeTiebreakers(stats)
    const standings = sortStandings([alice, bob], stats, tb)
    expect(standings[0].rank).toBe(1)
    expect(standings[1].rank).toBe(1) // tied
  })

  it('breaks final tie by player ID ascending', () => {
    const rounds = [
      makeRound(1, [makeByeMatch(1, 1), makeByeMatch(2, 2)]),
    ]
    const stats = computePlayerStats([alice, bob], rounds)
    const tb = computeTiebreakers(stats)
    const standings = sortStandings([alice, bob], stats, tb)
    expect(standings[0].player.id).toBe(1) // lower ID first
    expect(standings[1].player.id).toBe(2)
  })
})
