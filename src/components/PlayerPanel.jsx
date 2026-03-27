import { useState } from 'react'
import Modal from './ui/Modal'
import EditableName from './ui/EditableName'

export default function PlayerPanel({
  players,
  playerStats,
  isOpen,
  onClose,
  onAddLatePlayer,
  onEditPlayer,
  tournamentStarted,
  activeRoundHasBye,
}) {
  const [name, setName] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [pendingName, setPendingName] = useState('')

  const handleAdd = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    if (tournamentStarted) {
      setPendingName(trimmed)
      setShowOptions(true)
      setName('')
    } else {
      onAddLatePlayer({ name: trimmed, currentRoundAction: 'assign_loss' })
      setName('')
    }
  }

  const handleOptionSelect = (action) => {
    onAddLatePlayer({ name: pendingName, currentRoundAction: action })
    setShowOptions(false)
    setPendingName('')
  }

  const formatRecord = (stats) => {
    if (!stats) return ''
    const { w, l, d } = stats.matchRecord
    return `${w}-${l}-${d}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Players (${players.length})`}>
      <div className="space-y-4 max-h-96 flex flex-col">
        <form onSubmit={handleAdd} className="flex gap-2 shrink-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add player"
            className="flex-1 bg-bg-base border border-gold-dim rounded px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-primary text-sm"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Add
          </button>
        </form>

        <ul className="space-y-1 overflow-y-auto flex-1 min-h-0">
          {players.map((player) => {
            const stats = playerStats?.get(player.id)
            return (
              <li key={player.id} className="flex items-center justify-between px-2 py-1 text-sm group">
                <EditableName name={player.name} onSave={(name) => onEditPlayer(player.id, name)} />
                {stats && stats.roundsCompleted > 0 && (
                  <span className="text-text-muted">{formatRecord(stats)}</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {showOptions && (
        <div className="mt-4 pt-4 border-t border-gold-dim space-y-2">
          <p className="text-text-secondary text-sm">
            How should <strong>{pendingName}</strong> join this round?
          </p>
          <div className="flex flex-wrap gap-2">
            {activeRoundHasBye && (
              <button
                onClick={() => handleOptionSelect('pair_with_bye')}
                className="px-3 py-1.5 text-sm rounded border border-gold-dim text-text-secondary hover:border-gold-primary hover:text-text-primary transition-colors"
              >
                Pair with Bye Player
              </button>
            )}
            <button
              onClick={() => handleOptionSelect('award_bye')}
              className="px-3 py-1.5 text-sm rounded border border-gold-dim text-text-secondary hover:border-gold-primary hover:text-text-primary transition-colors"
            >
              Award Bye
            </button>
            <button
              onClick={() => handleOptionSelect('assign_loss')}
              className="px-3 py-1.5 text-sm rounded border border-gold-dim text-text-secondary hover:border-gold-primary hover:text-text-primary transition-colors"
            >
              Assign Loss
            </button>
          </div>
          <button
            onClick={() => { setShowOptions(false); setPendingName('') }}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </Modal>
  )
}
