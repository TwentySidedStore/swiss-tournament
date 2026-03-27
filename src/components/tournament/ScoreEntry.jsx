const PRESETS = [
  { label: '2-0', p1Wins: 2, p2Wins: 0 },
  { label: '2-1', p1Wins: 2, p2Wins: 1 },
  { label: '1-0', p1Wins: 1, p2Wins: 0 },
  { label: '1-1', p1Wins: 1, p2Wins: 1 },
  { label: '0-1', p1Wins: 0, p2Wins: 1 },
  { label: '1-2', p1Wins: 1, p2Wins: 2 },
  { label: '0-2', p1Wins: 0, p2Wins: 2 },
]

export default function ScoreEntry({ games, onSetGames, player1Name, player2Name }) {
  const isPresetActive = (preset) =>
    games.p1Wins === preset.p1Wins &&
    games.p2Wins === preset.p2Wins &&
    games.draws === 0

  return (
    <div className="space-y-2 pt-2 flex flex-col items-center" role="group" aria-label={`Match result for ${player1Name} vs ${player2Name}`}>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {PRESETS.map((preset) => {
          const active = isPresetActive(preset)
          return (
            <button
              key={preset.label}
              onClick={() => onSetGames({ p1Wins: preset.p1Wins, p2Wins: preset.p2Wins, draws: 0 })}
              className={`px-3 py-2.5 text-sm rounded border transition-colors min-w-[2.75rem] min-h-[2.75rem] ${
                active
                  ? 'bg-gold-primary text-bg-base font-semibold border-gold-primary'
                  : 'border-gold-dim text-text-secondary hover:border-gold-muted hover:text-text-primary'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-1.5 justify-center">
        <button
          onClick={() => onSetGames({ ...games, draws: games.draws + 1 })}
          className="px-3 py-2.5 text-sm rounded border border-gold-dim text-text-secondary hover:border-gold-muted hover:text-text-primary transition-colors min-h-[2.75rem]"
        >
          +Draw{games.draws > 0 && ` (${games.draws})`}
        </button>
        <button
          onClick={() => onSetGames({ p1Wins: 0, p2Wins: 0, draws: 0 })}
          className="px-3 py-2.5 text-sm rounded border border-gold-dim text-text-muted hover:border-gold-muted hover:text-text-secondary transition-colors min-h-[2.75rem]"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
