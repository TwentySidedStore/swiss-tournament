export default function RoundNav({ viewingRound, totalRounds, activeRound, onNavigate }) {
  const isFirst = viewingRound <= 0
  const isLast = viewingRound >= totalRounds - 1
  const isActive = viewingRound === activeRound

  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <button
        onClick={() => onNavigate(viewingRound - 1)}
        disabled={isFirst}
        className="text-text-secondary hover:text-text-primary disabled:text-text-disabled disabled:cursor-not-allowed transition-colors px-2 py-1"
        aria-label="Previous round"
      >
        ←
      </button>
      <div className="flex items-center gap-2">
        <span className="font-display text-lg text-text-primary">
          Round {viewingRound + 1} of {totalRounds}
        </span>
        {isActive && !false && (
          <span className="text-xs bg-gold-primary text-bg-base px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
            Active
          </span>
        )}
      </div>
      <button
        onClick={() => onNavigate(viewingRound + 1)}
        disabled={isLast}
        className="text-text-secondary hover:text-text-primary disabled:text-text-disabled disabled:cursor-not-allowed transition-colors px-2 py-1"
        aria-label="Next round"
      >
        →
      </button>
    </div>
  )
}
