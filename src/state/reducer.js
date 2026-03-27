import { Actions } from './actions'
import { generateRound1Pairings, generateRoundNPairings } from '../engine/pairing'

export function newTournamentState(id) {
  return { ...initialState(), id }
}

export function initialState() {
  return {
    id: null,
    players: [],
    rounds: [],
    nextId: 1,
    nextMatchId: 1,
    activeRound: null,
    viewingRound: null,
    currentTab: 'rounds',
    tournamentStarted: false,
    tournamentComplete: false,
    maxRounds: null,
    tournamentName: '',
    tournamentDate: new Date().toISOString().split('T')[0],
  }
}

export function tournamentReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return action.state
    case Actions.ADD_PLAYER: {
      if (state.players.length >= 256) return state
      return {
        ...state,
        players: [...state.players, { id: state.nextId, name: action.name }],
        nextId: state.nextId + 1,
      }
    }

    case Actions.REMOVE_PLAYER: {
      if (state.tournamentStarted) return state
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
      }
    }

    case Actions.BULK_ADD_PLAYERS: {
      const names = action.names
      if (state.players.length + names.length > 256) return state
      const newPlayers = names.map((name, i) => ({
        id: state.nextId + i,
        name,
      }))
      return {
        ...state,
        players: [...state.players, ...newPlayers],
        nextId: state.nextId + names.length,
      }
    }

    case Actions.SET_TOURNAMENT_NAME:
      return { ...state, tournamentName: action.name }

    case Actions.SET_TOURNAMENT_DATE:
      return { ...state, tournamentDate: action.date }

    case Actions.START_TOURNAMENT: {
      if (state.players.length < 2) return state
      const { matches, nextMatchId } = generateRound1Pairings(
        state.players,
        state.nextMatchId,
      )
      return {
        ...state,
        tournamentStarted: true,
        maxRounds: action.maxRounds,
        activeRound: 0,
        viewingRound: 0,
        nextMatchId,
        rounds: [
          {
            roundNumber: 1,
            matches,
            locked: false,
          },
        ],
      }
    }

    case Actions.SET_VIEWING_ROUND: {
      if (action.index < 0 || action.index >= state.rounds.length) return state
      return { ...state, viewingRound: action.index }
    }

    case Actions.SET_TAB:
      return { ...state, currentTab: action.tab }

    case Actions.SET_MATCH_RESULT: {
      const newRounds = state.rounds.map((round) => ({
        ...round,
        matches: round.matches.map((match) => {
          if (match.id !== action.matchId) return match
          if (match.type !== 'normal') return match
          return { ...match, games: { ...action.games } }
        }),
      }))
      return { ...state, rounds: newRounds }
    }

    case Actions.COMPLETE_ROUND: {
      if (state.activeRound === null) return state
      if (state.activeRound >= state.maxRounds - 1) return state // final round — use FINISH_TOURNAMENT

      const completedRounds = state.rounds.map((round, i) =>
        i === state.activeRound ? { ...round, locked: true } : round,
      )

      const { matches, nextMatchId } = generateRoundNPairings(
        state.players,
        completedRounds,
        state.nextMatchId,
      )

      return {
        ...state,
        rounds: [
          ...completedRounds,
          {
            roundNumber: completedRounds.length + 1,
            matches,
            locked: false,
          },
        ],
        activeRound: state.activeRound + 1,
        viewingRound: state.activeRound + 1,
        currentTab: 'rounds',
        nextMatchId,
      }
    }

    case Actions.DELETE_ROUND: {
      if (state.rounds.length === 0) return state

      // If tournament is complete, reopen first
      const wasComplete = state.tournamentComplete

      if (state.rounds.length === 1) {
        // Deleting round 1 → back to registration
        return {
          ...state,
          tournamentStarted: false,
          tournamentComplete: false,
          rounds: [],
          activeRound: null,
          viewingRound: null,
          maxRounds: null,
        }
      }

      // Deleting round 2+ → pop and unlock previous
      const newRounds = state.rounds.slice(0, -1)
      const lastIdx = newRounds.length - 1
      newRounds[lastIdx] = { ...newRounds[lastIdx], locked: false }

      return {
        ...state,
        rounds: newRounds,
        activeRound: lastIdx,
        viewingRound: lastIdx,
        tournamentComplete: false,
      }
    }

    case Actions.FINISH_TOURNAMENT: {
      if (state.activeRound === null) return state
      const newRounds = state.rounds.map((round, i) =>
        i === state.activeRound ? { ...round, locked: true } : round,
      )
      return {
        ...state,
        rounds: newRounds,
        tournamentComplete: true,
        currentTab: 'standings',
      }
    }

    case Actions.REOPEN_TOURNAMENT:
      return {
        ...state,
        tournamentComplete: false,
        currentTab: 'rounds',
      }

    case Actions.ADD_LATE_PLAYER: {
      const newPlayer = { id: state.nextId, name: action.name }
      let nextMatchId = state.nextMatchId

      // Insert assigned losses for all locked rounds
      const newRounds = state.rounds.map((round, i) => {
        if (!round.locked) return round
        const lossMatch = {
          id: nextMatchId++,
          player1Id: newPlayer.id,
          player2Id: null,
          type: 'assigned_loss',
          games: { p1Wins: 0, p2Wins: 2, draws: 0 },
        }
        return { ...round, matches: [...round.matches, lossMatch] }
      })

      // Handle current active round
      if (state.activeRound !== null && state.activeRound < newRounds.length) {
        const activeRound = { ...newRounds[state.activeRound] }
        const activeMatches = [...activeRound.matches]

        switch (action.currentRoundAction) {
          case 'pair_with_bye': {
            const byeIdx = activeMatches.findIndex((m) => m.type === 'bye')
            if (byeIdx !== -1) {
              activeMatches[byeIdx] = {
                ...activeMatches[byeIdx],
                player2Id: newPlayer.id,
                type: 'normal',
                games: { p1Wins: 0, p2Wins: 0, draws: 0 },
              }
            }
            break
          }
          case 'award_bye': {
            activeMatches.push({
              id: nextMatchId++,
              player1Id: newPlayer.id,
              player2Id: null,
              type: 'bye',
              games: { p1Wins: 2, p2Wins: 0, draws: 0 },
            })
            break
          }
          case 'assign_loss': {
            activeMatches.push({
              id: nextMatchId++,
              player1Id: newPlayer.id,
              player2Id: null,
              type: 'assigned_loss',
              games: { p1Wins: 0, p2Wins: 2, draws: 0 },
            })
            break
          }
        }

        activeRound.matches = activeMatches
        newRounds[state.activeRound] = activeRound
      }

      return {
        ...state,
        players: [...state.players, newPlayer],
        nextId: state.nextId + 1,
        nextMatchId,
        rounds: newRounds,
      }
    }

    case Actions.SAVE_PAIRINGS: {
      const round = state.rounds[action.roundIndex]
      if (!round || round.locked) return state
      const newRounds = state.rounds.map((r, i) =>
        i === action.roundIndex ? { ...r, matches: action.matches } : r,
      )
      return { ...state, rounds: newRounds }
    }

    case Actions.NEW_TOURNAMENT:
      return initialState()

    default:
      return state
  }
}
