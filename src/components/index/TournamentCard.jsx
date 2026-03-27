export default function TournamentCard({ tournament, onOpen, onDelete }) {
  const isActive = tournament.status === 'active'
  const borderColor = isActive ? 'border-l-gold-primary' : 'border-l-text-muted'
  const opacity = isActive ? '' : 'opacity-90'

  const statusBadge = isActive
    ? <span className="text-xs text-gold-primary font-semibold uppercase tracking-wide">Active</span>
    : <span className="text-xs text-text-muted font-semibold uppercase tracking-wide">Completed</span>

  const roundInfo = () => {
    if (!isActive) return null
    if (tournament.currentRound === null) return 'Not started'
    const pending = tournament.pendingResults > 0
      ? ` · ${tournament.pendingResults} pending`
      : ''
    return `Rd ${tournament.currentRound}/${tournament.maxRounds}${pending}`
  }

  return (
    <article
      className={`bg-bg-surface rounded border-l-4 ${borderColor} ${opacity} hover:bg-bg-overlay transition-colors relative group`}
      aria-label={`${tournament.name}, ${tournament.status}${isActive && tournament.currentRound ? `, Round ${tournament.currentRound} of ${tournament.maxRounds}` : ''}${tournament.pendingResults > 0 ? `, ${tournament.pendingResults} results pending` : ''}`}
    >
      <button
        onClick={() => onOpen(tournament.id)}
        className="w-full text-left px-4 py-3 pr-12"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-text-primary font-medium truncate mr-2">{tournament.name}</span>
          {statusBadge}
        </div>
        {roundInfo() && (
          <p className="text-text-secondary text-sm">{roundInfo()}</p>
        )}
        <p className="text-text-muted text-sm">
          {tournament.playerCount} player{tournament.playerCount !== 1 ? 's' : ''} · {tournament.date}
        </p>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(tournament.id)
        }}
        className="absolute top-3 right-3 text-text-muted hover:text-loss transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center"
        aria-label={`Delete ${tournament.name}`}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </article>
  )
}
