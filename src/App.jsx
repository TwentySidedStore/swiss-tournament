import { useReducer, useEffect, useState, useMemo, useRef } from 'react'
import { appReducer, appInitialState } from './state/appReducer'
import { AppActions } from './state/appActions'
import { tournamentReducer, newTournamentState } from './state/reducer'
import { Actions } from './state/actions'
import {
  saveAppState, loadAppState, saveTournament, loadTournament,
  deleteTournamentData, migrateIfNeeded,
} from './state/persistence'
import { deriveSummary } from './engine/summary'
import { computePlayerStats, computeTiebreakers, sortStandings } from './engine/stats'
import Header from './components/Header'
import Footer from './components/Footer'
import Registration from './components/registration/Registration'
import Tournament from './components/tournament/Tournament'
import TournamentIndex from './components/index/TournamentIndex'

function refreshSummaries(appState) {
  return appState.tournaments.map((t) => {
    const state = loadTournament(t.id)
    if (!state) return t
    return deriveSummary(state)
  })
}

export default function App() {
  // App-level state
  const [appState, appDispatch] = useReducer(appReducer, null, () => {
    migrateIfNeeded()
    const loaded = loadAppState()
    if (loaded) {
      const refreshed = refreshSummaries(loaded)
      return { ...loaded, tournaments: refreshed, currentTournamentId: null }
    }
    return appInitialState()
  })

  // Tournament-level state (loaded on demand)
  const [tournamentState, tournamentDispatch] = useReducer(tournamentReducer, null)

  // Load/unload tournament when currentTournamentId changes
  useEffect(() => {
    if (appState.currentTournamentId) {
      const loaded = loadTournament(appState.currentTournamentId)
      tournamentDispatch({
        type: 'LOAD',
        state: loaded || newTournamentState(appState.currentTournamentId),
      })
    } else {
      tournamentDispatch({ type: 'LOAD', state: null })
    }
  }, [appState.currentTournamentId])

  // Persist tournament on every change (with stale guard)
  useEffect(() => {
    if (tournamentState?.id && tournamentState.id === appState.currentTournamentId) {
      saveTournament(tournamentState.id, tournamentState)
    }
  }, [tournamentState, appState.currentTournamentId])

  // Persist app state on every change
  useEffect(() => {
    saveAppState(appState)
  }, [appState])

  // Derived stats
  const playerStats = useMemo(
    () => tournamentState ? computePlayerStats(tournamentState.players, tournamentState.rounds) : null,
    [tournamentState?.players, tournamentState?.rounds],
  )
  const tiebreakers = useMemo(
    () => playerStats ? computeTiebreakers(playerStats) : null,
    [playerStats],
  )
  const standings = useMemo(
    () => (tournamentState && playerStats && tiebreakers)
      ? sortStandings(tournamentState.players, playerStats, tiebreakers)
      : [],
    [tournamentState?.players, playerStats, tiebreakers],
  )

  // Close handler: sync summary back to index
  const handleClose = () => {
    const summary = tournamentState ? deriveSummary(tournamentState) : null
    appDispatch({ type: AppActions.CLOSE_TOURNAMENT, summary })
  }

  // Delete handler: remove from localStorage + index
  const handleDelete = (id) => {
    deleteTournamentData(id)
    appDispatch({ type: AppActions.DELETE_TOURNAMENT, id })
  }

  // Live region announcements
  const [announcement, setAnnouncement] = useState('')
  const prevRoundsLen = useRef(tournamentState?.rounds?.length ?? 0)
  useEffect(() => {
    const len = tournamentState?.rounds?.length ?? 0
    if (len > prevRoundsLen.current) {
      setAnnouncement(`Round ${len} pairings generated`)
    }
    if (tournamentState?.tournamentComplete) {
      setAnnouncement('Tournament complete')
    }
    prevRoundsLen.current = len
  }, [tournamentState?.rounds?.length, tournamentState?.tournamentComplete])

  // --- Render ---

  // Index view
  if (appState.currentTournamentId === null) {
    return <TournamentIndex appState={appState} appDispatch={appDispatch} onDelete={handleDelete} />
  }

  // Loading: tournament ID set but state not loaded yet
  if (!tournamentState) return null

  // Tournament view
  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body flex flex-col">
      <Header
        tournamentName={tournamentState.tournamentName}
        tournamentStarted={tournamentState.tournamentStarted}
        tournamentComplete={tournamentState.tournamentComplete}
        playerCount={tournamentState.players.length}
        players={tournamentState.players}
        playerStats={playerStats}
        activeRoundHasBye={
          tournamentState.activeRound !== null && tournamentState.rounds[tournamentState.activeRound]
            ? tournamentState.rounds[tournamentState.activeRound].matches.some((m) => m.type === 'bye')
            : false
        }
        onBackToEvents={handleClose}
        onAddLatePlayer={({ name, currentRoundAction }) =>
          tournamentDispatch({ type: Actions.ADD_LATE_PLAYER, name, currentRoundAction })
        }
        onEditPlayer={(playerId, name) =>
          tournamentDispatch({ type: Actions.EDIT_PLAYER, playerId, name })
        }
        onPrint={() => window.print()}
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {!tournamentState.tournamentStarted && (
          <Registration
            players={tournamentState.players}
            tournamentName={tournamentState.tournamentName}
            tournamentDate={tournamentState.tournamentDate}
            dispatch={tournamentDispatch}
          />
        )}
        {tournamentState.tournamentStarted && (
          <Tournament
            state={tournamentState}
            dispatch={tournamentDispatch}
            playerStats={playerStats}
            tiebreakers={tiebreakers}
            standings={standings}
          />
        )}
      </main>

      <div className="hidden print-header">
        {tournamentState.tournamentName || 'Twenty Sided Swiss'} — {tournamentState.tournamentDate}
      </div>

      <div aria-live="polite" aria-atomic="true" className="absolute w-px h-px overflow-hidden" style={{ clip: 'rect(0,0,0,0)' }}>
        {announcement}
      </div>

      <Footer />
    </div>
  )
}
