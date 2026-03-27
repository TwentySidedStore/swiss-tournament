import { describe, it, expect } from 'vitest'
import { tournamentReducer, initialState } from './reducer'
import { Actions } from './actions'

function dispatch(state, action) {
  return tournamentReducer(state, action)
}

describe('ADD_PLAYER', () => {
  it('adds a player with the correct ID and increments nextId', () => {
    const state = dispatch(initialState(), { type: Actions.ADD_PLAYER, name: 'Alice' })
    expect(state.players).toHaveLength(1)
    expect(state.players[0]).toEqual({ id: 1, name: 'Alice' })
    expect(state.nextId).toBe(2)
  })

  it('adds multiple players with sequential IDs', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    expect(state.players).toHaveLength(2)
    expect(state.players[0].id).toBe(1)
    expect(state.players[1].id).toBe(2)
    expect(state.nextId).toBe(3)
  })

  it('rejects when at 256 players', () => {
    let state = initialState()
    for (let i = 0; i < 256; i++) {
      state = dispatch(state, { type: Actions.ADD_PLAYER, name: `Player ${i}` })
    }
    expect(state.players).toHaveLength(256)
    const rejected = dispatch(state, { type: Actions.ADD_PLAYER, name: 'One Too Many' })
    expect(rejected.players).toHaveLength(256)
  })
})

describe('REMOVE_PLAYER', () => {
  it('removes the correct player', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.REMOVE_PLAYER, playerId: 1 })
    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Bob')
  })

  it('rejects during tournament', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    const rejected = dispatch(state, { type: Actions.REMOVE_PLAYER, playerId: 1 })
    expect(rejected.players).toHaveLength(2)
  })
})

describe('BULK_ADD_PLAYERS', () => {
  it('adds multiple players with sequential IDs', () => {
    const state = dispatch(initialState(), {
      type: Actions.BULK_ADD_PLAYERS,
      names: ['Alice', 'Bob', 'Carol'],
    })
    expect(state.players).toHaveLength(3)
    expect(state.players[0]).toEqual({ id: 1, name: 'Alice' })
    expect(state.players[1]).toEqual({ id: 2, name: 'Bob' })
    expect(state.players[2]).toEqual({ id: 3, name: 'Carol' })
    expect(state.nextId).toBe(4)
  })

  it('rejects if total would exceed 256', () => {
    let state = initialState()
    for (let i = 0; i < 255; i++) {
      state = dispatch(state, { type: Actions.ADD_PLAYER, name: `P${i}` })
    }
    const rejected = dispatch(state, {
      type: Actions.BULK_ADD_PLAYERS,
      names: ['A', 'B'],
    })
    expect(rejected.players).toHaveLength(255)
  })
})

describe('SET_TOURNAMENT_NAME / SET_TOURNAMENT_DATE', () => {
  it('sets tournament name', () => {
    const state = dispatch(initialState(), {
      type: Actions.SET_TOURNAMENT_NAME,
      name: 'FNM Draft',
    })
    expect(state.tournamentName).toBe('FNM Draft')
  })

  it('sets tournament date', () => {
    const state = dispatch(initialState(), {
      type: Actions.SET_TOURNAMENT_DATE,
      date: '2026-03-27',
    })
    expect(state.tournamentDate).toBe('2026-03-27')
  })
})

describe('START_TOURNAMENT', () => {
  it('sets all state fields and generates round 1', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Carol' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Diana' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 2 })

    expect(state.tournamentStarted).toBe(true)
    expect(state.maxRounds).toBe(2)
    expect(state.activeRound).toBe(0)
    expect(state.viewingRound).toBe(0)
    expect(state.rounds).toHaveLength(1)
    expect(state.rounds[0].roundNumber).toBe(1)
    expect(state.rounds[0].locked).toBe(false)
    expect(state.rounds[0].matches.length).toBeGreaterThan(0)
  })

  it('generates matches with unique IDs', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Carol' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Diana' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 2 })

    const matchIds = state.rounds[0].matches.map((m) => m.id)
    const uniqueIds = new Set(matchIds)
    expect(uniqueIds.size).toBe(matchIds.length)
  })

  it('rejects with fewer than 2 players', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    const rejected = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    expect(rejected.tournamentStarted).toBe(false)
  })

  it('creates a bye match for odd player count', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Carol' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 2 })

    const matches = state.rounds[0].matches
    const byeMatch = matches.find((m) => m.type === 'bye')
    expect(byeMatch).toBeDefined()
    expect(byeMatch.player2Id).toBeNull()
    expect(byeMatch.games).toEqual({ p1Wins: 2, p2Wins: 0, draws: 0 })
  })
})

describe('SET_VIEWING_ROUND', () => {
  it('changes viewing round within bounds', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state = dispatch(state, { type: Actions.SET_VIEWING_ROUND, index: 0 })
    expect(state.viewingRound).toBe(0)
  })

  it('rejects out of bounds', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    const rejected = dispatch(state, { type: Actions.SET_VIEWING_ROUND, index: 5 })
    expect(rejected.viewingRound).toBe(0)
  })
})

describe('SET_TAB', () => {
  it('switches tab', () => {
    const state = dispatch(initialState(), { type: Actions.SET_TAB, tab: 'standings' })
    expect(state.currentTab).toBe('standings')
  })
})

describe('SET_MATCH_RESULT', () => {
  function startedTournament() {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Carol' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Diana' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 2 })
    return state
  }

  it('updates games for a normal match by matchId', () => {
    const state = startedTournament()
    const normalMatch = state.rounds[0].matches.find((m) => m.type === 'normal')
    const updated = dispatch(state, {
      type: Actions.SET_MATCH_RESULT,
      matchId: normalMatch.id,
      games: { p1Wins: 2, p2Wins: 1, draws: 0 },
    })
    const match = updated.rounds[0].matches.find((m) => m.id === normalMatch.id)
    expect(match.games).toEqual({ p1Wins: 2, p2Wins: 1, draws: 0 })
  })

  it('rejects edits to bye matches', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Carol' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 2 })
    const byeMatch = state.rounds[0].matches.find((m) => m.type === 'bye')
    if (!byeMatch) return // no bye in this pairing
    const rejected = dispatch(state, {
      type: Actions.SET_MATCH_RESULT,
      matchId: byeMatch.id,
      games: { p1Wins: 0, p2Wins: 2, draws: 0 },
    })
    const match = rejected.rounds[0].matches.find((m) => m.id === byeMatch.id)
    expect(match.games).toEqual({ p1Wins: 2, p2Wins: 0, draws: 0 })
  })

  it('succeeds on a locked round (no lock guard)', () => {
    let state = startedTournament()
    // Enter results for all matches
    state.rounds[0].matches.forEach((m) => {
      if (m.type === 'normal') {
        state = dispatch(state, {
          type: Actions.SET_MATCH_RESULT,
          matchId: m.id,
          games: { p1Wins: 2, p2Wins: 0, draws: 0 },
        })
      }
    })
    state = dispatch(state, { type: Actions.COMPLETE_ROUND })
    expect(state.rounds[0].locked).toBe(true)

    // Edit a score on the locked round
    const lockedMatch = state.rounds[0].matches.find((m) => m.type === 'normal')
    const edited = dispatch(state, {
      type: Actions.SET_MATCH_RESULT,
      matchId: lockedMatch.id,
      games: { p1Wins: 1, p2Wins: 2, draws: 0 },
    })
    const match = edited.rounds[0].matches.find((m) => m.id === lockedMatch.id)
    expect(match.games).toEqual({ p1Wins: 1, p2Wins: 2, draws: 0 })
  })
})

describe('COMPLETE_ROUND', () => {
  function tournamentWithResults() {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Carol' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Diana' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 2 })
    // Enter results for all normal matches
    state.rounds[0].matches.forEach((m) => {
      if (m.type === 'normal') {
        state = dispatch(state, {
          type: Actions.SET_MATCH_RESULT,
          matchId: m.id,
          games: { p1Wins: 2, p2Wins: 0, draws: 0 },
        })
      }
    })
    return state
  }

  it('locks the round and generates the next', () => {
    let state = tournamentWithResults()
    state = dispatch(state, { type: Actions.COMPLETE_ROUND })
    expect(state.rounds[0].locked).toBe(true)
    expect(state.rounds).toHaveLength(2)
    expect(state.rounds[1].roundNumber).toBe(2)
    expect(state.activeRound).toBe(1)
    expect(state.viewingRound).toBe(1)
    expect(state.currentTab).toBe('rounds')
  })

  it('is a no-op on the final round', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state.rounds[0].matches.forEach((m) => {
      if (m.type === 'normal') {
        state = dispatch(state, {
          type: Actions.SET_MATCH_RESULT,
          matchId: m.id,
          games: { p1Wins: 2, p2Wins: 0, draws: 0 },
        })
      }
    })
    const before = { ...state }
    state = dispatch(state, { type: Actions.COMPLETE_ROUND })
    expect(state.rounds).toHaveLength(before.rounds.length)
    expect(state.tournamentComplete).toBe(false)
  })
})

describe('DELETE_ROUND', () => {
  it('returns to registration when deleting round 1', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state = dispatch(state, { type: Actions.DELETE_ROUND })
    expect(state.tournamentStarted).toBe(false)
    expect(state.rounds).toHaveLength(0)
    expect(state.activeRound).toBeNull()
    expect(state.viewingRound).toBeNull()
    expect(state.maxRounds).toBeNull()
    expect(state.players).toHaveLength(2) // players preserved
  })

  it('pops round and unlocks previous for round 2+', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Carol' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Diana' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 2 })
    // Complete round 1
    state.rounds[0].matches.forEach((m) => {
      if (m.type === 'normal') {
        state = dispatch(state, {
          type: Actions.SET_MATCH_RESULT,
          matchId: m.id,
          games: { p1Wins: 2, p2Wins: 0, draws: 0 },
        })
      }
    })
    state = dispatch(state, { type: Actions.COMPLETE_ROUND })
    expect(state.rounds).toHaveLength(2)

    // Delete round 2
    state = dispatch(state, { type: Actions.DELETE_ROUND })
    expect(state.rounds).toHaveLength(1)
    expect(state.rounds[0].locked).toBe(false)
    expect(state.activeRound).toBe(0)
    expect(state.viewingRound).toBe(0)
  })

  it('reopens and deletes after FINISH_TOURNAMENT', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state.rounds[0].matches.forEach((m) => {
      if (m.type === 'normal') {
        state = dispatch(state, {
          type: Actions.SET_MATCH_RESULT,
          matchId: m.id,
          games: { p1Wins: 2, p2Wins: 0, draws: 0 },
        })
      }
    })
    state = dispatch(state, { type: Actions.FINISH_TOURNAMENT })
    expect(state.tournamentComplete).toBe(true)

    state = dispatch(state, { type: Actions.DELETE_ROUND })
    expect(state.tournamentComplete).toBe(false)
    expect(state.tournamentStarted).toBe(false)
    expect(state.rounds).toHaveLength(0)
    expect(state.players).toHaveLength(2)
  })
})

describe('FINISH_TOURNAMENT', () => {
  it('locks final round and sets tournament complete', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state = dispatch(state, { type: Actions.FINISH_TOURNAMENT })
    expect(state.rounds[0].locked).toBe(true)
    expect(state.tournamentComplete).toBe(true)
    expect(state.currentTab).toBe('standings')
  })
})

describe('REOPEN_TOURNAMENT', () => {
  it('clears tournament complete and switches to rounds', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state = dispatch(state, { type: Actions.FINISH_TOURNAMENT })
    expect(state.tournamentComplete).toBe(true)

    state = dispatch(state, { type: Actions.REOPEN_TOURNAMENT })
    expect(state.tournamentComplete).toBe(false)
    expect(state.currentTab).toBe('rounds')
    expect(state.rounds).toHaveLength(1) // everything preserved
  })
})

describe('SAVE_PAIRINGS', () => {
  it('replaces matches for an unlocked round', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    const newMatches = [
      { id: 100, player1Id: 2, player2Id: 1, type: 'normal', games: { p1Wins: 0, p2Wins: 0, draws: 0 } },
    ]
    state = dispatch(state, { type: Actions.SAVE_PAIRINGS, roundIndex: 0, matches: newMatches })
    expect(state.rounds[0].matches).toEqual(newMatches)
  })

  it('rejects if round is locked', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state = dispatch(state, { type: Actions.FINISH_TOURNAMENT })
    const before = state.rounds[0].matches
    state = dispatch(state, { type: Actions.SAVE_PAIRINGS, roundIndex: 0, matches: [] })
    expect(state.rounds[0].matches).toEqual(before)
  })
})

describe('NEW_TOURNAMENT', () => {
  it('resets to initial state', () => {
    let state = initialState()
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Alice' })
    state = dispatch(state, { type: Actions.ADD_PLAYER, name: 'Bob' })
    state = dispatch(state, { type: Actions.START_TOURNAMENT, maxRounds: 1 })
    state = dispatch(state, { type: Actions.NEW_TOURNAMENT })
    expect(state.players).toHaveLength(0)
    expect(state.rounds).toHaveLength(0)
    expect(state.tournamentStarted).toBe(false)
    expect(state.nextId).toBe(1)
    expect(state.nextMatchId).toBe(1)
  })
})
