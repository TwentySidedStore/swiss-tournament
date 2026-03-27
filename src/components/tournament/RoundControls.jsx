import { useState } from 'react'
import { deriveResult } from '../../engine/stats'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function RoundControls({
  round,
  isActiveRound,
  incompleteCount,
  isLastRound,
  tournamentComplete,
  onCompleteRound,
  onDeleteRound,
  onFinishTournament,
  onReopenTournament,
  onEditPairings,
  canEditPairings,
}) {
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isActiveRound && !tournamentComplete) return null

  if (tournamentComplete) {
    return (
      <div className="mt-4 text-center">
        <button
          onClick={onReopenTournament}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Reopen Tournament
        </button>
      </div>
    )
  }

  const nextRoundNumber = round.roundNumber + 1
  const canComplete = incompleteCount === 0

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canEditPairings && (
            <button
              onClick={onEditPairings}
              className="text-sm text-gold-mid hover:text-gold-primary transition-colors"
            >
              Edit Pairings
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-text-muted hover:text-loss transition-colors"
          >
            Delete Round
          </button>

          {isLastRound ? (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              disabled={!canComplete}
              className="px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Finish Tournament
              {!canComplete && ` (${incompleteCount} incomplete)`}
            </button>
          ) : (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              disabled={!canComplete}
              className="px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Start Round {nextRoundNumber}
              {!canComplete && ` (${incompleteCount} incomplete)`}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCompleteConfirm}
        message="Complete Round?"
        confirmLabel={isLastRound ? 'Finish Tournament' : `Start Round ${nextRoundNumber}`}
        onConfirm={() => {
          setShowCompleteConfirm(false)
          if (isLastRound) {
            onFinishTournament()
          } else {
            onCompleteRound()
          }
        }}
        onCancel={() => setShowCompleteConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        message="Delete Round and entered results?"
        confirmLabel="Delete Round"
        onConfirm={() => {
          setShowDeleteConfirm(false)
          onDeleteRound()
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        requireTyping="DELETE"
      />
    </div>
  )
}
