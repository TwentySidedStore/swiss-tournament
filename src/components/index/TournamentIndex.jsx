import { useState } from 'react'
import { AppActions } from '../../state/appActions'
import IndexTabBar from './IndexTabBar'
import TournamentCard from './TournamentCard'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function TournamentIndex({ appState, appDispatch, onDelete }) {
  const [deleteTarget, setDeleteTarget] = useState(null)

  const activeTournaments = appState.tournaments
    .filter((t) => t.status === 'active')
    .sort((a, b) => {
      // Needs attention first (more pending = higher)
      if (b.pendingResults !== a.pendingResults) return b.pendingResults - a.pendingResults
      // Then by date descending
      return b.date.localeCompare(a.date)
    })

  const completedTournaments = appState.tournaments
    .filter((t) => t.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date))

  const displayed = appState.indexTab === 'active' ? activeTournaments : completedTournaments
  const deleteTargetTournament = deleteTarget ? appState.tournaments.find((t) => t.id === deleteTarget) : null

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body flex flex-col">
      <header className="border-b border-gold-dim px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-xl md:text-2xl text-gold-primary tracking-wide">
            Twenty Sided Swiss
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full pb-24 md:pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1" />
          <button
            onClick={() => appDispatch({ type: AppActions.CREATE_TOURNAMENT })}
            className="hidden md:block px-4 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright transition-colors text-sm"
          >
            + New Tournament
          </button>
        </div>

        <IndexTabBar
          activeTab={appState.indexTab}
          activeTournamentCount={activeTournaments.length}
          completedTournamentCount={completedTournaments.length}
          onTabChange={(tab) => appDispatch({ type: AppActions.SET_INDEX_TAB, tab })}
        />

        {displayed.length === 0 && appState.indexTab === 'active' && (
          <div className="text-center py-12">
            <p className="text-text-muted mb-4">No active tournaments.</p>
            <button
              onClick={() => appDispatch({ type: AppActions.CREATE_TOURNAMENT })}
              className="px-6 py-2 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright transition-colors"
            >
              + New Tournament
            </button>
          </div>
        )}

        {displayed.length === 0 && appState.indexTab === 'completed' && (
          <p className="text-text-muted text-center py-12">No completed tournaments.</p>
        )}

        <div className="space-y-2">
          {displayed.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
              onOpen={(id) => appDispatch({ type: AppActions.OPEN_TOURNAMENT, id })}
              onDelete={(id) => setDeleteTarget(id)}
            />
          ))}
        </div>
      </main>

      {/* Mobile fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-bg-base border-t border-gold-dim md:hidden" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => appDispatch({ type: AppActions.CREATE_TOURNAMENT })}
          className="w-full py-3 bg-gold-primary text-bg-base font-semibold rounded hover:bg-gold-bright transition-colors"
        >
          + New Tournament
        </button>
      </div>

      <footer className="text-center text-text-muted text-sm py-4 border-t border-gold-dim">
        Twenty Sided Store ·{' '}
        <a
          href="https://github.com/TwentySidedStore/swiss-tournament"
          className="underline hover:text-text-secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          View source on GitHub
        </a>
      </footer>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        message={`Delete ${deleteTargetTournament?.name || 'tournament'} and all results?`}
        confirmLabel="Delete"
        onConfirm={() => {
          onDelete(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
