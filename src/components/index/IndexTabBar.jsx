export default function IndexTabBar({ activeTab, activeTournamentCount, completedTournamentCount, onTabChange }) {
  const tabs = [
    { id: 'active', label: `Active (${activeTournamentCount})` },
    { id: 'completed', label: `Completed (${completedTournamentCount})` },
  ]

  const handleKeyDown = (e) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onTabChange(tabs[(currentIndex + 1) % tabs.length].id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onTabChange(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id)
    }
  }

  return (
    <div role="tablist" className="flex border-b border-gold-dim mb-4" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === tab.id
              ? 'text-gold-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-primary" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  )
}
