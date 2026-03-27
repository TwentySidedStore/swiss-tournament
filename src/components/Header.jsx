import { useState } from 'react'
import PlayerPanel from './PlayerPanel'

export default function Header({
  tournamentName,
  tournamentStarted,
  tournamentComplete,
  playerCount,
  players,
  playerStats,
  activeRoundHasBye,
  onBackToEvents,
  onAddLatePlayer,
  onEditPlayer,
  onPrint,
}) {
  const [showPlayerPanel, setShowPlayerPanel] = useState(false)

  return (
    <header className="border-b border-gold-dim px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToEvents}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            ← Events
          </button>
          {tournamentName && (
            <span className="text-text-secondary text-sm hidden md:inline">
              {tournamentName}
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
        </div>
      </div>

      <PlayerPanel
        isOpen={showPlayerPanel}
        onClose={() => setShowPlayerPanel(false)}
        players={players ?? []}
        playerStats={playerStats}
        onAddLatePlayer={onAddLatePlayer}
        onEditPlayer={onEditPlayer}
        tournamentStarted={tournamentStarted}
        activeRoundHasBye={activeRoundHasBye}
      />
    </header>
  )
}
