import { useState } from 'react'
import ConfirmDialog from './ui/ConfirmDialog'
import PlayerPanel from './PlayerPanel'

export default function Header({
  tournamentName,
  tournamentStarted,
  tournamentComplete,
  playerCount,
  players,
  playerStats,
  activeRoundHasBye,
  onNewTournament,
  onAddLatePlayer,
  onPrint,
}) {
  const [showNewConfirm, setShowNewConfirm] = useState(false)
  const [showPlayerPanel, setShowPlayerPanel] = useState(false)

  const handleNewTournament = () => {
    if (tournamentStarted && !tournamentComplete) {
      setShowNewConfirm(true)
    } else {
      onNewTournament()
    }
  }

  return (
    <header className="border-b border-gold-dim px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-xl md:text-2xl text-gold-primary tracking-wide">
            Twenty Sided Swiss
          </h1>
          {tournamentName && tournamentStarted && (
            <span className="text-text-secondary text-sm hidden md:inline">
              — {tournamentName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tournamentStarted && (
            <button
              onClick={() => setShowPlayerPanel(true)}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors px-2 py-1"
            >
              Players ({playerCount})
            </button>
          )}
          {tournamentStarted && (
            <button
              onClick={onPrint}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors px-2 py-1"
              aria-label="Print"
            >
              Print
            </button>
          )}
          {tournamentStarted && (
            <button
              onClick={handleNewTournament}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors px-2 py-1"
            >
              New
            </button>
          )}
        </div>
      </div>

      <PlayerPanel
        isOpen={showPlayerPanel}
        onClose={() => setShowPlayerPanel(false)}
        players={players ?? []}
        playerStats={playerStats}
        onAddLatePlayer={onAddLatePlayer}
        tournamentStarted={tournamentStarted}
        activeRoundHasBye={activeRoundHasBye}
      />

      <ConfirmDialog
        isOpen={showNewConfirm}
        message="Starting a new tournament will clear the current one. Continue?"
        confirmLabel="New Tournament"
        onConfirm={() => {
          setShowNewConfirm(false)
          onNewTournament()
        }}
        onCancel={() => setShowNewConfirm(false)}
      />
    </header>
  )
}
