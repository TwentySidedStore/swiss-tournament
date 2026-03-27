import { useReducer, useEffect, useState, useMemo, useRef } from 'react'
import { tournamentReducer, initialState } from './state/reducer'
import { Actions } from './state/actions'
import { saveState, loadState } from './state/persistence'
import { computePlayerStats, computeTiebreakers, sortStandings } from './engine/stats'
import Header from './components/Header'
import Footer from './components/Footer'
import Registration from './components/registration/Registration'
import Tournament from './components/tournament/Tournament'

export default function App() {
  const [state, dispatch] = useReducer(tournamentReducer, null, () => {
    return loadState() || initialState()
  })

  const [showRecoveryBanner, setShowRecoveryBanner] = useState(() => {
    const saved = loadState()
    return saved?.tournamentStarted === true
  })

  // Persist state on every change
  useEffect(() => {
    saveState(state)
  }, [state])

  // Derived stats — recomputed when rounds change
  const playerStats = useMemo(
    () => computePlayerStats(state.players, state.rounds),
    [state.players, state.rounds],
  )
  const tiebreakers = useMemo(
    () => computeTiebreakers(playerStats),
    [playerStats],
  )
  const standings = useMemo(
    () => sortStandings(state.players, playerStats, tiebreakers),
    [state.players, playerStats, tiebreakers],
  )

  // Live region for screen reader announcements
  const [announcement, setAnnouncement] = useState('')
  const prevRoundsLen = useRef(state.rounds.length)
  useEffect(() => {
    if (state.rounds.length > prevRoundsLen.current) {
      setAnnouncement(`Round ${state.rounds.length} pairings generated`)
    }
    if (state.tournamentComplete) {
      setAnnouncement('Tournament complete')
    }
    prevRoundsLen.current = state.rounds.length
  }, [state.rounds.length, state.tournamentComplete])

  // Auto-dismiss recovery banner
  useEffect(() => {
    if (!showRecoveryBanner) return
    const timer = setTimeout(() => setShowRecoveryBanner(false), 5000)
    return () => clearTimeout(timer)
  }, [showRecoveryBanner])

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body flex flex-col">
      <Header
        tournamentName={state.tournamentName}
        tournamentStarted={state.tournamentStarted}
        tournamentComplete={state.tournamentComplete}
        playerCount={state.players.length}
        players={state.players}
        playerStats={playerStats}
        activeRoundHasBye={
          state.activeRound !== null && state.rounds[state.activeRound]
            ? state.rounds[state.activeRound].matches.some((m) => m.type === 'bye')
            : false
        }
        onNewTournament={() => dispatch({ type: Actions.NEW_TOURNAMENT })}
        onAddLatePlayer={({ name, currentRoundAction }) =>
          dispatch({ type: Actions.ADD_LATE_PLAYER, name, currentRoundAction })
        }
        onPrint={() => window.print()}
      />

      {showRecoveryBanner && state.tournamentStarted && (
        <div
          className="bg-bg-elevated border-b border-gold-dim px-4 py-2 text-center text-sm text-text-secondary cursor-pointer"
          onClick={() => setShowRecoveryBanner(false)}
          role="status"
        >
          Resumed: Round {(state.activeRound ?? 0) + 1} of {state.maxRounds}
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {!state.tournamentStarted && (
          <Registration
            players={state.players}
            tournamentName={state.tournamentName}
            tournamentDate={state.tournamentDate}
            dispatch={dispatch}
          />
        )}
        {state.tournamentStarted && (
          <Tournament state={state} dispatch={dispatch} playerStats={playerStats} tiebreakers={tiebreakers} standings={standings} />
        )}
      </main>

      <div className="hidden print-header">
        {state.tournamentName || 'Twenty Sided Swiss'} — {state.tournamentDate}
      </div>

      <div aria-live="polite" aria-atomic="true" className="absolute w-px h-px overflow-hidden" style={{ clip: 'rect(0,0,0,0)' }}>
        {announcement}
      </div>

      <Footer />
    </div>
  )
}
