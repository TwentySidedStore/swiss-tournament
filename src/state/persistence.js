const OLD_KEY = 'swiss-tournament-state'
const INDEX_KEY = 'swiss-tournaments-index'
const TOURNAMENT_PREFIX = 'swiss-tournament-'

// --- Legacy (single-tournament) ---

export function saveState(state) {
  try { localStorage.setItem(OLD_KEY, JSON.stringify(state)) } catch {}
}

export function loadState() {
  try {
    const saved = localStorage.getItem(OLD_KEY)
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

export function clearState() {
  try { localStorage.removeItem(OLD_KEY) } catch {}
}

// --- Multi-tournament: App state (index) ---

export function saveAppState(state) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(state)) } catch {}
}

export function loadAppState() {
  try {
    const saved = localStorage.getItem(INDEX_KEY)
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

// --- Multi-tournament: Individual tournaments ---

function tournamentKey(id) {
  return `${TOURNAMENT_PREFIX}${id}`
}

export function saveTournament(id, state) {
  try { localStorage.setItem(tournamentKey(id), JSON.stringify(state)) } catch {}
}

export function loadTournament(id) {
  try {
    const saved = localStorage.getItem(tournamentKey(id))
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

export function deleteTournamentData(id) {
  try { localStorage.removeItem(tournamentKey(id)) } catch {}
}

// --- Migration ---

export function migrateIfNeeded() {
  // Already migrated or fresh — nothing to do
  if (localStorage.getItem(INDEX_KEY)) return

  const oldRaw = localStorage.getItem(OLD_KEY)
  if (!oldRaw) return

  let oldState
  try {
    oldState = JSON.parse(oldRaw)
  } catch {
    // Corrupted — delete and start fresh
    localStorage.removeItem(OLD_KEY)
    return
  }

  // Inject id into the old state
  oldState.id = 1

  // Write new tournament key first (crash-safe)
  saveTournament(1, oldState)

  // Build summary
  const summary = {
    id: 1,
    name: oldState.tournamentName || 'Untitled',
    date: oldState.tournamentDate || '',
    status: oldState.tournamentComplete ? 'completed' : 'active',
    playerCount: oldState.players?.length ?? 0,
    currentRound: oldState.activeRound !== null ? oldState.activeRound + 1 : null,
    maxRounds: oldState.maxRounds,
    pendingResults: 0,
  }

  // Write index
  saveAppState({
    tournaments: [summary],
    currentTournamentId: null,
    nextTournamentId: 2,
    indexTab: 'active',
  })

  // Delete old key last
  localStorage.removeItem(OLD_KEY)
}
