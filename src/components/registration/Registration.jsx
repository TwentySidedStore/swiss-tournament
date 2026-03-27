import { useState } from 'react'
import { Actions } from '../../state/actions'
import PlayerInput from './PlayerInput'
import PlayerList from './PlayerList'
import BulkAdd from './BulkAdd'
import RoundCountSelector from './RoundCountSelector'

export default function Registration({ players, tournamentName, tournamentDate, dispatch }) {
  const [showRoundSelector, setShowRoundSelector] = useState(false)

  const canStart = players.length >= 2

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-text-secondary text-sm mb-1">Tournament Name</label>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => dispatch({ type: Actions.SET_TOURNAMENT_NAME, name: e.target.value })}
            placeholder="Optional"
            className="w-full bg-bg-surface border border-gold-dim rounded px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-primary"
          />
        </div>
        <div>
          <label className="block text-text-secondary text-sm mb-1">Date</label>
          <input
            type="date"
            value={tournamentDate}
            onChange={(e) => dispatch({ type: Actions.SET_TOURNAMENT_DATE, date: e.target.value })}
            className="w-full bg-bg-surface border border-gold-dim rounded px-3 py-2 text-text-primary focus:outline-none focus:border-gold-primary"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-gold-primary">Players</h2>
          <BulkAdd onBulkAdd={(names) => dispatch({ type: Actions.BULK_ADD_PLAYERS, names })} />
        </div>

        <PlayerInput
          onAdd={(name) => dispatch({ type: Actions.ADD_PLAYER, name })}
          disabled={players.length >= 256}
        />

        {players.length === 0 && (
          <p className="text-text-muted text-sm py-4 text-center">Add players to begin.</p>
        )}

        {players.length === 1 && (
          <p className="text-text-muted text-sm text-center">Add at least 2 players to start.</p>
        )}

        <PlayerList
          players={players}
          onRemove={(playerId) => dispatch({ type: Actions.REMOVE_PLAYER, playerId })}
          onEdit={(playerId, name) => dispatch({ type: Actions.EDIT_PLAYER, playerId, name })}
          readOnly={false}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-text-secondary text-sm">
          {players.length} player{players.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowRoundSelector(true)}
          disabled={!canStart}
          className="px-6 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Start Tournament
        </button>
      </div>

      {showRoundSelector && (
        <RoundCountSelector
          playerCount={players.length}
          onConfirm={(maxRounds) => {
            dispatch({ type: Actions.START_TOURNAMENT, maxRounds })
            setShowRoundSelector(false)
          }}
          onCancel={() => setShowRoundSelector(false)}
        />
      )}
    </div>
  )
}
