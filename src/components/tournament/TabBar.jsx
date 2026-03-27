export default function TabBar({ currentTab, activeRound, onTabChange }) {
  const tabs = [
    { id: 'rounds', label: `Rounds${activeRound !== null ? ` [${activeRound + 1}]` : ''}` },
    { id: 'standings', label: 'Standings' },
  ]

  const handleKeyDown = (e) => {
    const currentIndex = tabs.findIndex((t) => t.id === currentTab)
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = (currentIndex + 1) % tabs.length
      onTabChange(tabs[next].id)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const prev = (currentIndex - 1 + tabs.length) % tabs.length
      onTabChange(tabs[prev].id)
    }
  }

  return (
    <div role="tablist" className="flex border-b border-gold-dim mb-4" onKeyDown={handleKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={currentTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={currentTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            currentTab === tab.id
              ? 'text-gold-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {tab.label}
          {currentTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-primary" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  )
}
