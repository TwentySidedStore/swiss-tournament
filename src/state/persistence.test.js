import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveAppState, loadAppState,
  saveTournament, loadTournament, deleteTournamentData,
  migrateIfNeeded,
} from './persistence'

// Mock localStorage for persistence tests
let store = {}
beforeEach(() => {
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
  })
})

describe('saveAppState / loadAppState', () => {
  it('round-trips app state', () => {
    const state = { tournaments: [{ id: 1, name: 'Test' }], currentTournamentId: null, nextTournamentId: 2, indexTab: 'active' }
    saveAppState(state)
    expect(loadAppState()).toEqual(state)
  })

  it('returns null when nothing saved', () => {
    expect(loadAppState()).toBeNull()
  })
})

describe('saveTournament / loadTournament', () => {
  it('round-trips tournament state with ID-keyed storage', () => {
    const state = { id: 5, players: [{ id: 1, name: 'Alice' }], rounds: [] }
    saveTournament(5, state)
    expect(loadTournament(5)).toEqual(state)
  })

  it('returns null for non-existent tournament', () => {
    expect(loadTournament(999)).toBeNull()
  })

  it('stores tournaments independently', () => {
    saveTournament(1, { id: 1, name: 'A' })
    saveTournament(2, { id: 2, name: 'B' })
    expect(loadTournament(1).name).toBe('A')
    expect(loadTournament(2).name).toBe('B')
  })
})

describe('deleteTournamentData', () => {
  it('removes the correct key', () => {
    saveTournament(1, { id: 1 })
    saveTournament(2, { id: 2 })
    deleteTournamentData(1)
    expect(loadTournament(1)).toBeNull()
    expect(loadTournament(2)).not.toBeNull()
  })
})

describe('migrateIfNeeded', () => {
  it('migrates old single-tournament format to new multi-tournament format', () => {
    const oldState = {
      players: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      rounds: [],
      activeRound: null,
      viewingRound: null,
      currentTab: 'rounds',
      tournamentStarted: false,
      tournamentComplete: false,
      maxRounds: null,
      nextId: 3,
      nextMatchId: 1,
      tournamentName: 'FNM Draft',
      tournamentDate: '2026-03-27',
    }
    localStorage.setItem('swiss-tournament-state', JSON.stringify(oldState))

    migrateIfNeeded()

    // Old key removed
    expect(localStorage.getItem('swiss-tournament-state')).toBeNull()

    // Tournament saved with id: 1
    const migrated = loadTournament(1)
    expect(migrated).not.toBeNull()
    expect(migrated.id).toBe(1)
    expect(migrated.players).toHaveLength(2)
    expect(migrated.tournamentName).toBe('FNM Draft')

    // Index created
    const appState = loadAppState()
    expect(appState).not.toBeNull()
    expect(appState.tournaments).toHaveLength(1)
    expect(appState.tournaments[0].id).toBe(1)
    expect(appState.tournaments[0].name).toBe('FNM Draft')
    expect(appState.tournaments[0].playerCount).toBe(2)
    expect(appState.nextTournamentId).toBe(2)
  })

  it('is a no-op when already migrated', () => {
    const appState = { tournaments: [{ id: 1 }], nextTournamentId: 2, indexTab: 'active' }
    saveAppState(appState)
    migrateIfNeeded()
    expect(loadAppState()).toEqual(appState)
  })

  it('is a no-op on fresh install', () => {
    migrateIfNeeded()
    expect(loadAppState()).toBeNull()
  })

  it('handles corrupted old data gracefully', () => {
    localStorage.setItem('swiss-tournament-state', 'not-valid-json{{{')
    migrateIfNeeded()
    // Old key removed, fresh start
    expect(localStorage.getItem('swiss-tournament-state')).toBeNull()
    expect(loadAppState()).toBeNull()
  })
})
