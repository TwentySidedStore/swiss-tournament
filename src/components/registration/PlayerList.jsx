import EditableName from '../ui/EditableName'

export default function PlayerList({ players, onRemove, onEdit, readOnly }) {
  if (players.length === 0) return null

  return (
    <ul className="space-y-1">
      {players.map((player, index) => (
        <li
          key={player.id}
          className="flex items-center justify-between bg-bg-surface rounded px-3 py-2 group"
        >
          <span className="inline-flex items-center">
            <span className="text-text-muted text-sm mr-2">{index + 1}.</span>
            {onEdit ? (
              <EditableName name={player.name} onSave={(name) => onEdit(player.id, name)} />
            ) : (
              <span className="text-text-primary">{player.name}</span>
            )}
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
