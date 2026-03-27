import { useState } from 'react'

export default function StandingsTable({
  standings,
  tournamentComplete,
  tournamentName,
  tournamentDate,
  onNewTournament,
  onReopenTournament,
}) {
  const [sortByName, setSortByName] = useState(false)

  const displayed = sortByName
    ? [...standings].sort((a, b) => a.player.name.localeCompare(b.player.name))
    : standings

  const fmt = (n) => (n === 0 ? '0' : n.toFixed(4))

  if (standings.length === 0) {
    return (
      <div role="tabpanel" id="tabpanel-standings" aria-labelledby="tab-standings">
        <p className="text-text-muted text-sm text-center py-8">Standings update as results are entered.</p>
      </div>
    )
  }

  return (
    <div role="tabpanel" id="tabpanel-standings" aria-labelledby="tab-standings">
      {tournamentComplete && (
        <div className="bg-bg-elevated border border-gold-dim rounded-lg p-4 mb-4 text-center">
          <h2 className="font-display text-xl text-gold-primary mb-1">Tournament Complete</h2>
          {tournamentName && <p className="text-text-secondary text-sm">{tournamentName}</p>}
          {tournamentDate && <p className="text-text-muted text-sm">{tournamentDate}</p>}
          <div className="flex justify-center gap-3 mt-3">
            <button
              onClick={onReopenTournament}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors px-2 py-1"
            >
              Reopen Tournament
            </button>
            <button
              onClick={onNewTournament}
              className="text-sm px-3 py-1 bg-gold-primary text-bg-base rounded hover:bg-gold-bright transition-colors"
            >
              New Tournament
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-bg-base">
            <tr className="border-b border-gold-dim text-text-secondary text-left">
              <th scope="col" className="px-2 py-2 w-10">#</th>
              <th
                scope="col"
                className="px-2 py-2 cursor-pointer hover:text-text-primary transition-colors"
                onClick={() => setSortByName(!sortByName)}
                aria-sort={sortByName ? 'ascending' : 'none'}
              >
                Player {sortByName ? '↑' : ''}
              </th>
              <th scope="col" className="px-2 py-2 text-right">Pts</th>
              <th scope="col" className="px-2 py-2 text-right">Record</th>
              <th scope="col" className="px-2 py-2 text-right font-mono">OMW%</th>
              <th scope="col" className="px-2 py-2 text-right font-mono">GW%</th>
              <th scope="col" className="px-2 py-2 text-right font-mono">OGW%</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((entry, i) => (
              <tr
                key={entry.player.id}
                className="border-b border-gold-dim/20 hover:bg-bg-overlay transition-colors"
              >
                <td className="px-2 py-2 text-text-muted">{entry.rank}</td>
                <td className="px-2 py-2 text-text-primary">{entry.player.name}</td>
                <td className="px-2 py-2 text-right font-semibold text-text-primary">
                  {entry.stats?.matchPoints ?? 0}
                </td>
                <td className="px-2 py-2 text-right text-text-secondary">
                  {entry.stats ? `${entry.stats.matchRecord.w}-${entry.stats.matchRecord.l}-${entry.stats.matchRecord.d}` : '0-0-0'}
                </td>
                <td className="px-2 py-2 text-right font-mono text-text-secondary">
                  {fmt(entry.tiebreakers?.omwp ?? 0)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-text-secondary">
                  {fmt(entry.tiebreakers?.gwp ?? 0)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-text-secondary">
                  {fmt(entry.tiebreakers?.ogwp ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
