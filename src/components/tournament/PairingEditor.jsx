import { useState } from 'react'
import { generateRound1Pairings, generateRoundNPairings, buildFacedMap, BYE_PHANTOM } from '../../engine/pairing'

export default function PairingEditor({ round, players, playerStats, completedRounds, onSave, onCancel }) {
  const [pairings, setPairings] = useState(() =>
    round.matches
      .filter((m) => m.type === 'normal')
      .map((m) => [m.player1Id, m.player2Id]),
  )
  const [byePlayerId, setByePlayerId] = useState(() => {
    const bye = round.matches.find((m) => m.type === 'bye')
    return bye ? bye.player1Id : null
  })
  const [unpaired, setUnpaired] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  const playersById = Object.fromEntries(players.map((p) => [p.id, p]))
  const faced = buildFacedMap(completedRounds)

  const isRematch = (id1, id2) => {
    return faced.get(id1)?.has(id2) || faced.get(id2)?.has(id1) || false
  }

  const getPoints = (id) => playerStats?.get(id)?.matchPoints ?? 0

  const breakPairing = (index) => {
    const [p1, p2] = pairings[index]
    setPairings((prev) => prev.filter((_, i) => i !== index))
    setUnpaired((prev) => [...prev, p1, p2])
  }

  const breakBye = () => {
    if (byePlayerId === null) return
    setUnpaired((prev) => [...prev, byePlayerId])
    setByePlayerId(null)
  }

  const selectPlayer = (id) => {
    if (selectedId === null) {
      setSelectedId(id)
    } else if (selectedId === id) {
      setSelectedId(null)
    } else {
      // Create pairing
      setPairings((prev) => [...prev, [selectedId, id]])
      setUnpaired((prev) => prev.filter((pid) => pid !== selectedId && pid !== id))
      setSelectedId(null)
    }
  }

  const assignBye = (id) => {
    setByePlayerId(id)
    setUnpaired((prev) => prev.filter((pid) => pid !== id))
    setSelectedId(null)
  }

  const handleResetToAuto = () => {
    let result
    if (completedRounds.length === 0) {
      result = generateRound1Pairings(players, 1)
    } else {
      result = generateRoundNPairings(players, completedRounds, 1)
    }
    const newPairings = []
    let newBye = null
    for (const m of result.matches) {
      if (m.type === 'bye') {
        newBye = m.player1Id
      } else if (m.type === 'normal') {
        newPairings.push([m.player1Id, m.player2Id])
      }
    }
    setPairings(newPairings)
    setByePlayerId(newBye)
    setUnpaired([])
    setSelectedId(null)
  }

  const handleSave = () => {
    let matchId = 1 // IDs will be reassigned by SAVE_PAIRINGS consumer
    const matches = []
    for (const [p1, p2] of pairings) {
      matches.push({
        id: matchId++,
        player1Id: p1,
        player2Id: p2,
        type: 'normal',
        games: { p1Wins: 0, p2Wins: 0, draws: 0 },
      })
    }
    if (byePlayerId !== null) {
      matches.push({
        id: matchId++,
        player1Id: byePlayerId,
        player2Id: null,
        type: 'bye',
        games: { p1Wins: 2, p2Wins: 0, draws: 0 },
      })
    }
    onSave(matches)
  }

  const selectedPlayer = selectedId ? playersById[selectedId] : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-gold-primary">Edit Pairings</h3>
        <button
          onClick={handleResetToAuto}
          className="text-sm text-gold-mid hover:text-gold-primary transition-colors"
        >
          Reset to Auto
        </button>
      </div>

      {/* Sticky selection chip */}
      {selectedPlayer && (
        <div className="sticky top-0 z-10 bg-bg-elevated border border-gold-primary rounded px-3 py-2 flex items-center justify-between text-sm">
          <span>
            Pairing: <strong>{selectedPlayer.name}</strong> ({getPoints(selectedId)} pts) + ?
          </span>
          <button
            onClick={() => setSelectedId(null)}
            className="text-text-muted hover:text-text-primary ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unpaired players */}
      {unpaired.length > 0 && (
        <div>
          <h4 className="text-text-secondary text-sm mb-2">Unpaired Players</h4>
          <div className="space-y-1">
            {unpaired.map((id) => (
              <div
                key={id}
                className={`flex items-center justify-between bg-bg-surface rounded px-3 py-2 cursor-pointer transition-colors ${
                  selectedId === id ? 'border border-gold-primary' : 'border border-transparent hover:bg-bg-overlay'
                }`}
                onClick={() => selectPlayer(id)}
              >
                <span className="text-text-primary text-sm">
                  {playersById[id]?.name} <span className="text-text-muted">({getPoints(id)} pts)</span>
                </span>
                {unpaired.length === 1 && byePlayerId === null && (
                  <button
                    onClick={(e) => { e.stopPropagation(); assignBye(id) }}
                    className="text-xs text-bye hover:text-text-primary transition-colors"
                  >
                    Assign Bye
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current pairings */}
      <div>
        <h4 className="text-text-secondary text-sm mb-2">Pairings</h4>
        <div className="space-y-1">
          {pairings.map(([p1, p2], i) => {
            const rematch = isRematch(p1, p2)
            return (
              <div key={`${p1}-${p2}`} className="flex items-center justify-between bg-bg-surface rounded px-3 py-2">
                <div className="flex-1 text-sm">
                  <span className="text-text-primary">{playersById[p1]?.name}</span>
                  <span className="text-text-muted mx-2">vs</span>
                  <span className="text-text-primary">{playersById[p2]?.name}</span>
                  {rematch && (
                    <span className="ml-2 text-xs text-warning font-semibold">Rematch</span>
                  )}
                </div>
                <button
                  onClick={() => breakPairing(i)}
                  className="text-sm text-text-muted hover:text-loss transition-colors"
                >
                  Break
                </button>
              </div>
            )
          })}
          {byePlayerId !== null && (
            <div className="flex items-center justify-between bg-bg-surface rounded px-3 py-2">
              <div className="text-sm">
                <span className="text-text-primary">{playersById[byePlayerId]?.name}</span>
                <span className="text-xs text-bye ml-2">BYE</span>
              </div>
              <button
                onClick={breakBye}
                className="text-sm text-text-muted hover:text-loss transition-colors"
              >
                Break
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gold-dim">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-text-secondary hover:text-text-primary rounded border border-gold-dim hover:border-gold-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={unpaired.length > 0}
          className="px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save Pairings
        </button>
      </div>
    </div>
  )
}
