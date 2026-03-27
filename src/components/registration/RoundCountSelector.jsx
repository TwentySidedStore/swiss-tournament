import { useState } from 'react'
import Modal from '../ui/Modal'
import { recommendedRounds, defaultRounds } from '../../engine/roundCount'

export default function RoundCountSelector({ playerCount, onConfirm, onCancel }) {
  const recommended = recommendedRounds(playerCount)
  const [selectedRounds, setSelectedRounds] = useState(defaultRounds(playerCount))

  return (
    <Modal isOpen={true} onClose={onCancel} title="Start Tournament">
      <div className="space-y-4">
        <div>
          <label className="block text-text-secondary text-sm mb-2">
            Number of rounds
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedRounds((r) => Math.max(1, r - 1))}
              disabled={selectedRounds <= 1}
              className="w-10 h-10 rounded border border-gold-dim text-text-primary hover:border-gold-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
              aria-label="Decrease rounds"
            >
              −
            </button>
            <span className="text-2xl font-mono text-gold-primary w-8 text-center">
              {selectedRounds}
            </span>
            <button
              onClick={() => setSelectedRounds((r) => Math.min(recommended, r + 1))}
              disabled={selectedRounds >= recommended}
              className="w-10 h-10 rounded border border-gold-dim text-text-primary hover:border-gold-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
              aria-label="Increase rounds"
            >
              +
            </button>
          </div>
          <p className="text-text-muted text-sm mt-2">
            Recommended: {recommended} round{recommended !== 1 ? 's' : ''} for {playerCount} player{playerCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-text-secondary hover:text-text-primary rounded border border-gold-dim hover:border-gold-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedRounds)}
            className="px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    </Modal>
  )
}
