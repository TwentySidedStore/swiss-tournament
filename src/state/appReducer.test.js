import { describe, it, expect } from 'vitest'
import { appReducer, appInitialState } from './appReducer'
import { AppActions } from './appActions'

function dispatch(state, action) {
  return appReducer(state, action)
}

describe('CREATE_TOURNAMENT', () => {
  it('adds a summary and sets currentTournamentId', () => {
    const state = dispatch(appInitialState(), { type: AppActions.CREATE_TOURNAMENT })
    expect(state.tournaments).toHaveLength(1)
    expect(state.tournaments[0].id).toBe(1)
    expect(state.tournaments[0].status).toBe('active')
    expect(state.tournaments[0].playerCount).toBe(0)
    expect(state.currentTournamentId).toBe(1)
    expect(state.nextTournamentId).toBe(2)
  })

  it('creates two tournaments with sequential IDs', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    state = dispatch(state, { type: AppActions.CLOSE_TOURNAMENT, summary: state.tournaments[0] })
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    expect(state.tournaments).toHaveLength(2)
    expect(state.tournaments[0].id).toBe(1)
    expect(state.tournaments[1].id).toBe(2)
    expect(state.currentTournamentId).toBe(2)
    expect(state.nextTournamentId).toBe(3)
  })
})

describe('OPEN_TOURNAMENT', () => {
  it('sets currentTournamentId', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    state = dispatch(state, { type: AppActions.CLOSE_TOURNAMENT, summary: state.tournaments[0] })
    state = dispatch(state, { type: AppActions.OPEN_TOURNAMENT, id: 1 })
    expect(state.currentTournamentId).toBe(1)
  })
})

describe('CLOSE_TOURNAMENT', () => {
  it('clears currentTournamentId and updates summary', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    const updatedSummary = { ...state.tournaments[0], name: 'Updated Name', playerCount: 8 }
    state = dispatch(state, { type: AppActions.CLOSE_TOURNAMENT, summary: updatedSummary })
    expect(state.currentTournamentId).toBeNull()
    expect(state.tournaments[0].name).toBe('Updated Name')
    expect(state.tournaments[0].playerCount).toBe(8)
  })

  it('handles null summary gracefully', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    state = dispatch(state, { type: AppActions.CLOSE_TOURNAMENT, summary: null })
    expect(state.currentTournamentId).toBeNull()
    expect(state.tournaments).toHaveLength(1) // unchanged
  })
})

describe('DELETE_TOURNAMENT', () => {
  it('removes tournament from list', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    state = dispatch(state, { type: AppActions.CLOSE_TOURNAMENT, summary: state.tournaments[0] })
    state = dispatch(state, { type: AppActions.DELETE_TOURNAMENT, id: 1 })
    expect(state.tournaments).toHaveLength(0)
  })

  it('clears currentTournamentId if deleting the open one', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    expect(state.currentTournamentId).toBe(1)
    state = dispatch(state, { type: AppActions.DELETE_TOURNAMENT, id: 1 })
    expect(state.currentTournamentId).toBeNull()
    expect(state.tournaments).toHaveLength(0)
  })

  it('is a no-op if id not in list', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    const before = state.tournaments.length
    state = dispatch(state, { type: AppActions.DELETE_TOURNAMENT, id: 999 })
    expect(state.tournaments.length).toBe(before)
  })
})

describe('SET_INDEX_TAB', () => {
  it('switches tab', () => {
    const state = dispatch(appInitialState(), { type: AppActions.SET_INDEX_TAB, tab: 'completed' })
    expect(state.indexTab).toBe('completed')
  })
})

describe('REFRESH_SUMMARIES', () => {
  it('replaces all summaries', () => {
    let state = appInitialState()
    state = dispatch(state, { type: AppActions.CREATE_TOURNAMENT })
    const newSummaries = [{ id: 1, name: 'Refreshed', playerCount: 10, status: 'completed' }]
    state = dispatch(state, { type: AppActions.REFRESH_SUMMARIES, summaries: newSummaries })
    expect(state.tournaments).toEqual(newSummaries)
  })
})
