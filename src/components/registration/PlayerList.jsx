export default function PlayerList({ players, onRemove, readOnly }) {
  if (players.length === 0) return null

  return (
    <ul className="space-y-1">
      {players.map((player, index) => (
        <li
          key={player.id}
          className="flex items-center justify-between bg-bg-surface rounded px-3 py-2 group"
        >
          <span className="text-text-primary">
            <span className="text-text-muted text-sm mr-2">{index + 1}.</span>
            {player.name}
          </span>
          {!readOnly && (
            <button
              onClick={() => onRemove(player.id)}
              className="text-text-muted hover:text-loss opacity-0 group-hover:opacity-100 transition-opacity text-sm"
              aria-label={`Remove ${player.name}`}
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
