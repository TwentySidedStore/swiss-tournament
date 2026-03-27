import { deriveResult } from './stats'

export function countPending(state) {
  if (state.activeRound === null || !state.rounds[state.activeRound]) return 0
  return state.rounds[state.activeRound].matches.filter(
    (m) => m.type === 'normal' && deriveResult(m.games) === null,
  ).length
}

export function deriveSummary(state) {
  return {
    id: state.id,
    name: state.tournamentName || 'Untitled',
    date: state.tournamentDate,
    status: state.tournamentComplete ? 'completed' : 'active',
    playerCount: state.players.length,
    currentRound: state.activeRound !== null ? state.activeRound + 1 : null,
    maxRounds: state.maxRounds,
    pendingResults: countPending(state),
  }
}
