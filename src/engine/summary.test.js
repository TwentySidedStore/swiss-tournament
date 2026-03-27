import { describe, it, expect } from 'vitest'
import { deriveSummary, countPending } from './summary'

function makeTournamentState(overrides = {}) {
  return {
    id: 1,
    players: [],
    rounds: [],
    activeRound: null,
    viewingRound: null,
    currentTab: 'rounds',
    tournamentStarted: false,
    tournamentComplete: false,
    maxRounds: null,
    nextId: 1,
    nextMatchId: 1,
    tournamentName: '',
    tournamentDate: '2026-03-27',
    ...overrides,
  }
}

function makeMatch(id, p1, p2, games, type = 'normal') {
  return { id, player1Id: p1, player2Id: p2, type, games }
}

describe('countPending', () => {
  it('returns 0 when no active round', () => {
    expect(countPending(makeTournamentState())).toBe(0)
  })

  it('counts only normal matches with null result', () => {
    const state = makeTournamentState({
      activeRound: 0,
      rounds: [{
        roundNumber: 1,
        matches: [
          makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),  // has result
          makeMatch(2, 3, 4, { p1Wins: 0, p2Wins: 0, draws: 0 }),  // no result
          makeMatch(3, 5, null, { p1Wins: 2, p2Wins: 0, draws: 0 }, 'bye'),  // bye
        ],
        locked: false,
      }],
    })
    expect(countPending(state)).toBe(1)
  })

  it('excludes byes and assigned losses', () => {
    const state = makeTournamentState({
      activeRound: 0,
      rounds: [{
        roundNumber: 1,
        matches: [
          makeMatch(1, 1, null, { p1Wins: 2, p2Wins: 0, draws: 0 }, 'bye'),
          makeMatch(2, 2, null, { p1Wins: 0, p2Wins: 2, draws: 0 }, 'assigned_loss'),
        ],
        locked: false,
      }],
    })
    expect(countPending(state)).toBe(0)
  })

  it('counts partially entered round correctly', () => {
    const state = makeTournamentState({
      activeRound: 0,
      rounds: [{
        roundNumber: 1,
        matches: [
          makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 1, draws: 0 }),  // done
          makeMatch(2, 3, 4, { p1Wins: 0, p2Wins: 0, draws: 0 }),  // pending
          makeMatch(3, 5, 6, { p1Wins: 0, p2Wins: 0, draws: 0 }),  // pending
        ],
        locked: false,
      }],
    })
    expect(countPending(state)).toBe(2)
  })
})

describe('deriveSummary', () => {
  it('derives correct fields for an active tournament', () => {
    const state = makeTournamentState({
      id: 5,
      tournamentName: 'FNM Draft',
      tournamentDate: '2026-03-27',
      tournamentStarted: true,
      players: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' }],
      activeRound: 1,
      maxRounds: 3,
      rounds: [
        { roundNumber: 1, matches: [], locked: true },
        {
          roundNumber: 2,
          matches: [
            makeMatch(1, 1, 2, { p1Wins: 0, p2Wins: 0, draws: 0 }),
            makeMatch(2, 3, 4, { p1Wins: 2, p2Wins: 0, draws: 0 }),
          ],
          locked: false,
        },
      ],
    })
    const summary = deriveSummary(state)
    expect(summary.id).toBe(5)
    expect(summary.name).toBe('FNM Draft')
    expect(summary.date).toBe('2026-03-27')
    expect(summary.status).toBe('active')
    expect(summary.playerCount).toBe(4)
    expect(summary.currentRound).toBe(2)  // 1-indexed
    expect(summary.maxRounds).toBe(3)
    expect(summary.pendingResults).toBe(1)
  })

  it('handles tournament not started', () => {
    const summary = deriveSummary(makeTournamentState({ id: 1 }))
    expect(summary.status).toBe('active')
    expect(summary.currentRound).toBeNull()
    expect(summary.maxRounds).toBeNull()
    expect(summary.pendingResults).toBe(0)
    expect(summary.playerCount).toBe(0)
  })

  it('handles tournament complete', () => {
    const summary = deriveSummary(makeTournamentState({
      id: 2,
      tournamentComplete: true,
      players: [{ id: 1, name: 'A' }],
    }))
    expect(summary.status).toBe('completed')
  })

  it('defaults name to Untitled when empty', () => {
    const summary = deriveSummary(makeTournamentState({ id: 1, tournamentName: '' }))
    expect(summary.name).toBe('Untitled')
  })

  it('handles zero pending results', () => {
    const state = makeTournamentState({
      activeRound: 0,
      rounds: [{
        roundNumber: 1,
        matches: [
          makeMatch(1, 1, 2, { p1Wins: 2, p2Wins: 0, draws: 0 }),
        ],
        locked: false,
      }],
    })
    expect(deriveSummary(state).pendingResults).toBe(0)
  })
})
