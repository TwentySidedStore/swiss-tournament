import { deriveResult } from '../../engine/stats'
import ScoreEntry from './ScoreEntry'

export default function MatchCard({
  match,
  player1,
  player2,
  p1Stats,
  p2Stats,
  isExpanded,
  onToggleExpand,
  onSetGames,
}) {
  const result = deriveResult(match.games)
  const isBye = match.type === 'bye'
  const isAssignedLoss = match.type === 'assigned_loss'
  const isReadOnly = isBye || isAssignedLoss

  const borderColor = isReadOnly
    ? 'border-l-bye'
    : result !== null
      ? 'border-l-gold-primary'
      : 'border-l-text-muted'

  const formatRecord = (stats) => {
    if (!stats) return ''
    const { w, l, d } = stats.matchRecord
    return `${w}-${l}-${d}`
  }

  const formatScore = () => {
    const { p1Wins, p2Wins, draws } = match.games
    if (draws > 0) return `${p1Wins} - ${p2Wins} - ${draws}`
    return `${p1Wins} - ${p2Wins}`
  }

  const typeBadge = isBye ? 'BYE' : isAssignedLoss ? 'LOSS' : null

  return (
    <div
      data-match-card
      className={`bg-bg-surface rounded border-l-4 ${borderColor} transition-colors`}
    >
      <button
        onClick={isReadOnly ? undefined : onToggleExpand}
        disabled={isReadOnly}
        className={`w-full px-4 py-3 flex items-center justify-between text-left ${
          isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-bg-overlay'
        } transition-colors`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <span className="text-text-primary truncate">{player1?.name ?? '?'}</span>
            {p1Stats && (
              <span className="text-text-muted text-sm ml-1">({formatRecord(p1Stats)})</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 shrink-0">
          {typeBadge ? (
            <span className="text-xs text-bye font-semibold uppercase tracking-wide">
              {typeBadge}
            </span>
          ) : (
            <span className="font-mono text-text-secondary text-sm">{formatScore()}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          {!isReadOnly && (
            <>
              {p2Stats && (
                <span className="text-text-muted text-sm mr-1">({formatRecord(p2Stats)})</span>
              )}
              <span className="text-text-primary truncate text-right">{player2?.name ?? '?'}</span>
            </>
          )}
        </div>
      </button>

      {isExpanded && !isReadOnly && (
        <div className="px-4 pb-3 border-t border-gold-dim/30">
          <ScoreEntry
            games={match.games}
            onSetGames={onSetGames}
            player1Name={player1?.name ?? '?'}
            player2Name={player2?.name ?? '?'}
          />
        </div>
      )}
    </div>
  )
}
