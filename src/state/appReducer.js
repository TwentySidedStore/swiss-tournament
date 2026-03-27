import { AppActions } from './appActions'

export function appInitialState() {
  return {
    tournaments: [],
    currentTournamentId: null,
    nextTournamentId: 1,
    indexTab: 'active',
  }
}

export function appReducer(state, action) {
  switch (action.type) {
    case AppActions.CREATE_TOURNAMENT: {
      const id = state.nextTournamentId
      const today = new Date().toISOString().split('T')[0]
      const summary = {
        id,
        name: 'Untitled',
        date: today,
        status: 'active',
        playerCount: 0,
        currentRound: null,
        maxRounds: null,
        pendingResults: 0,
      }
      return {
        ...state,
        tournaments: [...state.tournaments, summary],
        currentTournamentId: id,
        nextTournamentId: id + 1,
      }
    }

    case AppActions.OPEN_TOURNAMENT:
      return { ...state, currentTournamentId: action.id }

    case AppActions.CLOSE_TOURNAMENT: {
      if (!action.summary) {
        return { ...state, currentTournamentId: null }
      }
      return {
        ...state,
        currentTournamentId: null,
        tournaments: state.tournaments.map((t) =>
          t.id === action.summary.id ? action.summary : t,
        ),
      }
    }

    case AppActions.DELETE_TOURNAMENT:
      return {
        ...state,
        tournaments: state.tournaments.filter((t) => t.id !== action.id),
        currentTournamentId: state.currentTournamentId === action.id ? null : state.currentTournamentId,
      }

    case AppActions.SET_INDEX_TAB:
      return { ...state, indexTab: action.tab }

    case AppActions.REFRESH_SUMMARIES:
      return { ...state, tournaments: action.summaries }

    default:
      return state
  }
}
