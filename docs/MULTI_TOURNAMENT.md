# Multi-Tournament Support — Implementation Plan

## Overview

Add support for managing multiple tournaments simultaneously. The app opens to an **index view** listing all tournaments. TOs can create, open, and delete tournaments. Each tournament's data is stored independently in localStorage.

This document covers the full implementation. Read `PLAN.md` for the single-tournament design spec and `IMPLEMENTATION.md` for the existing architecture.

---

## Navigation Model

```
                    ┌──────────────┐
            ┌──────▶│  Index View  │◀──────┐
            │       │ Active|Done  │       │
            │       └──┬───────┬───┘       │
            │          │       │            │
         ← Events   + New    Click card  ← Events
            │          │       │            │
            │          ▼       ▼            │
            │       ┌──────────────┐       │
            ├───────│ Registration │───────┤
            │       └──────┬───────┘       │
            │              │ Start         │
            │              ▼               │
            │       ┌──────────────┐       │
            ├───────│   Rounds     │───────┤
            │       └──────┬───────┘       │
            │              │ Finish        │
            │              ▼               │
            │       ┌──────────────┐       │
            └───────│  Standings   │───────┘
                    └──────────────┘
```

- **"← Events"** in the header always returns to the index. Available from any tournament view.
- **"+ New Tournament"** from the index creates a new tournament and opens it in Registration.
- **Clicking a card** opens that tournament wherever it left off.
- **"New Tournament" button in the header is removed** — replaced by "← Events".

---

## Storage Model

```
localStorage keys:
  "swiss-tournaments-index"   →  AppState (index + navigation)
  "swiss-tournament-1"        →  TournamentState (full state for tournament 1)
  "swiss-tournament-2"        →  TournamentState (full state for tournament 2)
  ...
```

Each tournament stored independently. The index is a lightweight summary — no match data. Old `swiss-tournament-state` key auto-migrated on first load.

---

## Data Model

### AppState (new — top-level)

```js
{
  tournaments: [TournamentSummary],
  currentTournamentId: null,     // which tournament is open (null = index view)
  nextTournamentId: 1,
  indexTab: "active",            // "active" | "completed"
}
```

### TournamentSummary (stored in AppState.tournaments[])

```js
{
  id: number,
  name: string,
  date: string,
  status: "active" | "completed",
  playerCount: number,
  currentRound: number | null,   // 1-indexed (e.g. 2 means Round 2)
  maxRounds: number | null,
  pendingResults: number,        // matches without results in the active round
}
```

Summaries are synced from the full tournament state **on close, finish, and reopen** — not on every keystroke. When the index loads, summaries are re-derived from stored tournament data as a safety net (handles crash/tab-close where the summary wasn't synced).

### TournamentState (existing — unchanged, plus `id`)

The existing tournament state object (`players`, `rounds`, `activeRound`, etc.) with one addition:

```js
{
  id: number,       // matches the summary id
  ...existing state
}
```

---

## Index View UI

### Layout — Mobile (375px)

```
┌─────────────────────────────────────┐
│  Twenty Sided Swiss                 │  ← header (no back button on index)
├─────────────────────────────────────┤
│  Active (2)  │  Completed (3)       │  ← tabs with counts
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │▌ FNM Draft        [ACTIVE] │    │  ← gold left border
│  │▌ Rd 2/3 · 4 pending        │    │
│  │▌ 8 players · Mar 27    [🗑] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │▌ 2HG League       [ACTIVE] │    │
│  │▌ Rd 1/3 · 0 pending        │    │
│  │▌ 12 players · Mar 27   [🗑] │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  [ + New Tournament ]               │  ← fixed bottom bar on mobile
└─────────────────────────────────────┘
```

### Layout — Desktop (1024px+)

- Max width 800px centered, single column cards
- "+ New Tournament" moves to top-right of content area (not fixed bottom)
- Cards have more horizontal space for name/metadata

### Tournament Card

- **Full card is the tap/click target** → opens the tournament
- **Delete icon** (small, top-right) with `e.stopPropagation()` → confirm dialog
- **Gold left border** for active, **gray left border** for completed
- **Completed cards** at ~90% opacity
- **Name truncates** with ellipsis on one line (mobile), wraps on desktop

**Active card content:**
```
{name}                    [ACTIVE]
Round {n} of {max} · {pending} results pending
{playerCount} players · {date}
```

When tournament not yet started (no rounds):
```
{name}                    [ACTIVE]
Not started
{playerCount} players · {date}
```

**Completed card content:**
```
{name}                 [COMPLETED]
{playerCount} players · {date}
```

### Active Events Sort Order

1. Events with pending results > 0 (needs attention) — sorted by most pending
2. Events with 0 pending results — sorted by date descending

### Empty States

- **Active tab, empty**: "No active tournaments." with inline "+ New Tournament" button
- **Completed tab, empty**: "No completed tournaments."

### Delete Confirmation

Standard confirm dialog: "Delete {name} and all results?" with [Cancel] [Delete] buttons. No type-to-confirm.

---

## Header Changes

| View | Left side | Right side |
|---|---|---|
| **Index** | "Twenty Sided Swiss" | (nothing) |
| **Tournament (registration)** | "← Events" | (nothing) |
| **Tournament (in progress)** | "← Events" | Players(N) · Print |
| **Tournament (complete)** | "← Events" | Players(N) · Print |

- "← Events" is a navigation action only — tournament data is already persisted by the tournament state effect. Clicking it dispatches CLOSE_TOURNAMENT (which syncs the summary and sets `currentTournamentId` to null).
- "New Tournament" button removed from header entirely.
- Tournament name shown below header (or inline) when inside a tournament, same as currently.

---

## App-Level Reducer

### Actions

```js
export const AppActions = {
  CREATE_TOURNAMENT:    'CREATE_TOURNAMENT',
  OPEN_TOURNAMENT:      'OPEN_TOURNAMENT',
  CLOSE_TOURNAMENT:     'CLOSE_TOURNAMENT',
  DELETE_TOURNAMENT:     'DELETE_TOURNAMENT',
  SET_INDEX_TAB:        'SET_INDEX_TAB',
  REFRESH_SUMMARIES:    'REFRESH_SUMMARIES',
}
```

### Action Payloads and Behavior

**CREATE_TOURNAMENT** (no payload — name/date set in the registration view)
- Generate new tournament ID from `nextTournamentId++`
- Add summary to `tournaments[]` with `status: "active"`, `playerCount: 0`, `pendingResults: 0`
- Set `currentTournamentId` to the new ID
- The tournament state is created in App.jsx when the load effect detects a new ID with no stored data

**OPEN_TOURNAMENT** `{ id }`
- Set `currentTournamentId` to `id`
- Tournament state loaded from localStorage by the App component's effect

**CLOSE_TOURNAMENT** `{ summary }` (summary derived from current tournament state before closing)
- Update the matching entry in `tournaments[]` with the provided summary
- Set `currentTournamentId` to `null`
- This is the only moment the index summary is synced — not on every keystroke

**DELETE_TOURNAMENT** `{ id }`
- Remove from `tournaments[]`
- Delete `swiss-tournament-{id}` from localStorage (via side effect in App.jsx, not in reducer)
- If `currentTournamentId === id`, set to `null`

**SET_INDEX_TAB** `{ tab: "active" | "completed" }`

**REFRESH_SUMMARIES** `{ summaries: [TournamentSummary] }`
- Replace all summaries in `tournaments[]`. Used on index load as a safety net — re-derives summaries from stored tournament data to catch any stale summaries from crashes.

### Initial State

```js
{
  tournaments: [],
  currentTournamentId: null,
  nextTournamentId: 1,
  indexTab: "active",
}
```

---

## Persistence Changes

### New Functions (persistence.js)

```js
saveAppState(state)           // saves to "swiss-tournaments-index"
loadAppState()                // loads from "swiss-tournaments-index"
saveTournament(id, state)     // saves to "swiss-tournament-{id}"
loadTournament(id)            // loads from "swiss-tournament-{id}"
deleteTournamentData(id)      // removes "swiss-tournament-{id}"
migrateIfNeeded()             // one-time migration from old single-tournament format
```

### Migration (migrateIfNeeded)

On first load:
1. Check if `swiss-tournament-state` exists (old format)
2. If yes:
   a. Parse the old state
   b. Inject `id: 1` into the state object
   c. Write to `swiss-tournament-1` (new key first — crash-safe)
   d. Build a summary via `deriveSummary` from the patched state
   e. Create an index with `{ tournaments: [summary], nextTournamentId: 2 }`
   f. Write the index to `swiss-tournaments-index`
   g. Delete `swiss-tournament-state` (old key last — if crash before this, migration re-runs harmlessly)
3. If old key does not exist: check `swiss-tournaments-index`, load normally
4. If neither exists: fresh start
5. If old key is corrupted/unparseable: delete it, fresh start

### refreshSummaries()

On index load, iterate all tournament IDs in the index, load each tournament state, re-derive the summary. This catches stale summaries from tab-close/crash scenarios where CLOSE_TOURNAMENT never fired. Called once on app init.

```js
function refreshSummaries(appState) {
  return appState.tournaments.map(t => {
    const state = loadTournament(t.id)
    if (!state) return t  // tournament data missing, keep stale summary
    return deriveSummary(state)
  })
}
```

---

## App.jsx Restructure

Two levels of state:

```jsx
function App() {
  // App-level state (index, navigation)
  const [appState, appDispatch] = useReducer(appReducer, null, () => {
    migrateIfNeeded()
    const loaded = loadAppState()
    if (loaded) {
      // Re-derive summaries as safety net
      const refreshed = refreshSummaries(loaded)
      return { ...loaded, tournaments: refreshed, currentTournamentId: null }
    }
    return appInitialState()
  })

  // Tournament-level state (loaded on demand)
  const [tournamentState, tournamentDispatch] = useReducer(tournamentReducer, null)

  // When currentTournamentId changes, load tournament state
  useEffect(() => {
    if (appState.currentTournamentId) {
      const loaded = loadTournament(appState.currentTournamentId)
      tournamentDispatch({
        type: 'LOAD',
        state: loaded || newTournamentState(appState.currentTournamentId)
      })
    } else {
      tournamentDispatch({ type: 'LOAD', state: null })
    }
  }, [appState.currentTournamentId])

  // Persist tournament on every tournament state change
  // Guard: only save if this tournament is still the current one
  useEffect(() => {
    if (tournamentState?.id && tournamentState.id === appState.currentTournamentId) {
      saveTournament(tournamentState.id, tournamentState)
    }
  }, [tournamentState, appState.currentTournamentId])

  // Persist app state on every app state change
  useEffect(() => {
    saveAppState(appState)
  }, [appState])

  // Handle CLOSE: derive summary and dispatch
  const handleClose = () => {
    if (tournamentState) {
      appDispatch({
        type: AppActions.CLOSE_TOURNAMENT,
        summary: deriveSummary(tournamentState)
      })
    } else {
      appDispatch({ type: AppActions.CLOSE_TOURNAMENT, summary: null })
    }
  }

  // Handle DELETE: also remove from localStorage
  const handleDelete = (id) => {
    deleteTournamentData(id)
    appDispatch({ type: AppActions.DELETE_TOURNAMENT, id })
  }

  // Index view
  if (appState.currentTournamentId === null) {
    return <IndexView appState={appState} appDispatch={appDispatch} onDelete={handleDelete} />
  }

  // Loading state: tournament ID is set but state hasn't loaded yet
  if (!tournamentState) return null

  // Tournament view
  return <TournamentView
    tournamentState={tournamentState}
    tournamentDispatch={tournamentDispatch}
    onClose={handleClose}
  />
}
```

**Key design decisions:**
- Tournament state persists on every change (one localStorage write per action)
- Index summary syncs only on CLOSE — no SYNC_TOURNAMENT on every keystroke
- On index load, summaries are re-derived as a safety net (handles crash/tab-close)
- Stale-tournament guard: `tournamentState.id === appState.currentTournamentId` prevents saving the wrong tournament during rapid switches
- Null guard: if `currentTournamentId` is set but `tournamentState` is null (loading), render nothing (one frame, invisible)

### deriveSummary(tournamentState) → TournamentSummary

```js
// engine/summary.js
import { deriveResult } from './stats'

export function deriveSummary(state) {
  const pendingResults = countPending(state)
  return {
    id: state.id,
    name: state.tournamentName || 'Untitled',
    date: state.tournamentDate,
    status: state.tournamentComplete ? 'completed' : 'active',
    playerCount: state.players.length,
    currentRound: state.activeRound !== null ? state.activeRound + 1 : null,
    maxRounds: state.maxRounds,
    pendingResults,
  }
}

export function countPending(state) {
  if (state.activeRound === null || !state.rounds[state.activeRound]) return 0
  return state.rounds[state.activeRound].matches.filter(
    m => m.type === 'normal' && deriveResult(m.games) === null
  ).length
}
```

---

## Tournament Reducer Changes

### New Action

**LOAD** `{ state }` — replaces entire tournament state. Used when opening a tournament from the index. If `state` is `null`, returns `null` (used on close).

### Existing Changes

- Add `id` field to `initialState` (default `null`, set on creation)
- Keep `NEW_TOURNAMENT` action alive until Header is updated (Step 6) to avoid breaking the app mid-build. Remove it in Step 6 when the header no longer references it.

### newTournamentState(id)

Factory function for creating a blank tournament state with a specific ID:
```js
function newTournamentState(id) {
  return { ...initialState(), id }
}
```

---

## New Components

### TournamentIndex.jsx
```
Props: appState, appDispatch, onDelete
```
- Renders IndexTabBar, tournament card list, empty states
- "+ New Tournament" button (fixed bottom on mobile, top-right on desktop)
- Filters tournaments by tab: active = `status === "active"`, completed = `status === "completed"`
- Sorts active: pending results desc (needs attention first), then date desc
- Sorts completed: date desc
- Dispatches `CREATE_TOURNAMENT` on "+ New Tournament"
- Dispatches `OPEN_TOURNAMENT` on card click
- Calls `onDelete(id)` on card delete (after confirm)

### IndexTabBar.jsx
```
Props: activeTab, activeTournamentCount, completedTournamentCount, onTabChange
```
- "Active (N)" | "Completed (N)" tabs
- Same ARIA pattern as existing TabBar (role="tablist", aria-selected, arrow keys)

### TournamentCard.jsx
```
Props: tournament (TournamentSummary), onOpen, onDelete
```
- Full card clickable → `onOpen(tournament.id)`
- Delete icon in top-right with `e.stopPropagation()` → `onDelete(tournament.id)`
- Gold left border + full opacity for active
- Gray left border + 90% opacity for completed
- `aria-label` includes name + status: "FNM Draft, active, Round 2 of 3, 4 results pending"
- Delete button `aria-label`: "Delete FNM Draft"
- Name: one line, truncate with ellipsis on mobile, wrap on desktop

**Active card displays:**
- Name + [ACTIVE] badge (gold text)
- "Round {n} of {max} · {pending} results pending" (or "Not started" if no rounds)
- "{playerCount} players · {date}"

**Completed card displays:**
- Name + [COMPLETED] badge (gray text)
- "{playerCount} players · {date}"

---

## Existing Component Changes

### Header.jsx
- Add `onBackToEvents` prop (replaces `onNewTournament`)
- Show "← Events" back button when inside a tournament (`onBackToEvents` is set)
- Remove "New Tournament" and "New" buttons
- Keep Players(N) and Print when inside a tournament

### App.jsx
- Full restructure per the App.jsx section above
- Two reducers, conditional rendering, persistence effects with guards

### Registration.jsx
- No changes

### Tournament.jsx
- No changes

---

## WCAG Accessibility

- Tournament cards: `<article>` element with `aria-label` including name, status, and pending info
- Delete button: `aria-label="Delete {tournament name}"`, minimum 44x44px touch target
- Index tabs: `role="tablist"` / `role="tab"` with `aria-selected`, arrow key navigation
- Tab labels include counts for screen readers
- Focus management: when opening a tournament, focus moves to the main content. When closing (back to index), focus moves to the first card.
- "+ New Tournament" button: large touch target (full width on mobile), clear label
- Keyboard: Enter/Space on a card opens it. Tab navigates between cards. Delete button reachable via Tab.
- Confirm dialog for delete: focus trapped, Escape to cancel (uses existing ConfirmDialog component)

---

## Test Plan (TDD)

### persistence.test.js (new tests)

```
saveAppState / loadAppState: round-trip
saveTournament / loadTournament: round-trip with ID-keyed storage
deleteTournamentData: removes correct key, other keys untouched
migrateIfNeeded: migrates old format to new (id injected, summary derived)
migrateIfNeeded: no-op when already migrated
migrateIfNeeded: no-op on fresh install
migrateIfNeeded: corrupted old data falls back to fresh start
```

### summary.test.js (new file)

```
deriveSummary: correct playerCount, status, currentRound, maxRounds
deriveSummary: tournament not started (nulls for round fields)
deriveSummary: tournament complete → status "completed"
deriveSummary: empty name → "Untitled"
countPending: counts only normal matches with null result
countPending: 0 when no active round
countPending: excludes byes and assigned losses
countPending: mid-round with some results entered (partial)
```

### appReducer.test.js (new file)

```
CREATE_TOURNAMENT: adds summary, increments nextTournamentId, sets currentTournamentId
CREATE_TOURNAMENT: two tournaments → sequential IDs
OPEN_TOURNAMENT: sets currentTournamentId
CLOSE_TOURNAMENT: clears currentTournamentId, updates summary in list
CLOSE_TOURNAMENT with null summary: clears currentTournamentId only
DELETE_TOURNAMENT: removes from list
DELETE_TOURNAMENT: clears currentTournamentId if deleting the open one
DELETE_TOURNAMENT: no-op if id not in list
SET_INDEX_TAB: switches tab
REFRESH_SUMMARIES: replaces all summaries
```

### reducer.test.js (additions)

```
LOAD: replaces entire state
LOAD with null: returns null
id field present in initial state
```

### Integration test

```
Full multi-tournament flow:
1. Create tournament A
2. Add players, start tournament A
3. Close (back to index) — verify summary shows correct round/pending
4. Create tournament B
5. Add players, start tournament B
6. Close — verify both A and B in index with correct summaries
7. Open A, enter results, close — verify pending count updated
8. Open B, enter results, close — verify pending count updated
9. Finish tournament A — verify A moves to completed tab
10. Delete tournament B — verify B removed, A still in completed
11. Open A (completed) — verify opens to standings
12. Reopen A — verify A moves back to active tab
```

---

## File Structure (new/changed files)

```
src/
├── state/
│   ├── appReducer.js          (NEW)
│   ├── appReducer.test.js     (NEW)
│   ├── appActions.js          (NEW)
│   ├── reducer.js             (CHANGED — add LOAD action, id field)
│   ├── reducer.test.js        (CHANGED — add LOAD tests)
│   └── persistence.js         (CHANGED — add multi-tournament functions, migration)
│   └── persistence.test.js    (NEW)
├── engine/
│   ├── summary.js             (NEW — deriveSummary, countPending)
│   └── summary.test.js        (NEW)
├── components/
│   ├── index/                 (NEW directory)
│   │   ├── TournamentIndex.jsx
│   │   ├── IndexTabBar.jsx
│   │   └── TournamentCard.jsx
│   ├── Header.jsx             (CHANGED — back button, remove New Tournament)
│   └── ...existing unchanged
├── App.jsx                    (CHANGED — two-level state, conditional rendering)
```

---

## Build Order

Each step: write tests → implement → verify → commit.

### Step 1: Persistence layer + migration
**Tests first:** `persistence.test.js`
**Files:** Update `persistence.js`
- Add `saveAppState`, `loadAppState`, `saveTournament`, `loadTournament`, `deleteTournamentData`
- Add `migrateIfNeeded`:
  - Parse old state, inject `id: 1`
  - Write `swiss-tournament-1` first (crash-safe)
  - Derive summary, write index
  - Delete old key last
  - Handle corrupted data gracefully
- Verify: all persistence tests pass

### Step 2: deriveSummary + countPending
**Tests first:** `summary.test.js`
**Files:** `engine/summary.js`
- `deriveSummary(state)` — extracts summary from full tournament state
- `countPending(state)` — counts normal matches with `deriveResult(games) === null` in active round
- Verify: all summary tests pass

### Step 3: App-level reducer
**Tests first:** `appReducer.test.js`
**Files:** `state/appActions.js`, `state/appReducer.js`
- All actions: CREATE_TOURNAMENT, OPEN_TOURNAMENT, CLOSE_TOURNAMENT, DELETE_TOURNAMENT, SET_INDEX_TAB, REFRESH_SUMMARIES
- CLOSE_TOURNAMENT receives `{ summary }` and updates the tournament entry
- Verify: all app reducer tests pass

### Step 4: Tournament reducer updates
**Tests first:** Add to `reducer.test.js`
**Files:** Update `state/reducer.js`
- Add `LOAD` action — replaces entire state, returns `null` if payload is null
- Add `id: null` to `initialState`
- Keep `NEW_TOURNAMENT` alive (removed in Step 6)
- Add `newTournamentState(id)` factory function
- Verify: all reducer tests pass (existing + new)

### Step 5+6: Index view + wire App.jsx (merged — can't verify independently)
**Files:** `components/index/TournamentIndex.jsx`, `IndexTabBar.jsx`, `TournamentCard.jsx`, update `App.jsx`
- Build index components
- Restructure App.jsx with two-level state
- Migration on first load via `migrateIfNeeded()`
- Summary refresh on index load via `refreshSummaries()`
- Load/unload tournament state on open/close with guards:
  - Stale-tournament guard: `tournamentState.id === appState.currentTournamentId`
  - Null guard: render nothing if tournament not yet loaded
- handleClose derives summary, dispatches CLOSE_TOURNAMENT
- handleDelete removes localStorage data, dispatches DELETE_TOURNAMENT
- Conditional rendering: index vs tournament
- Remove `NEW_TOURNAMENT` usage from the app (was kept alive until now)
- Verify: full app works — can create, open, close, delete tournaments in browser

### Step 7: Update Header
**Files:** Update `Header.jsx`
- Add `onBackToEvents` prop
- Show "← Events" when inside a tournament
- Remove "New Tournament" / "New" buttons
- Verify: navigation works end-to-end

### Step 8: Accessibility + polish
- ARIA on TournamentCard (`<article>`, `aria-label`), IndexTabBar (`role="tablist"`)
- Delete button `aria-label`, 44px touch target
- Focus management: open → focus main, close → focus first card
- Keyboard: Enter/Space opens card, Tab between cards, delete reachable
- Gold/gray visual distinction for active/completed
- Mobile: fixed bottom "+ New Tournament" with `env(safe-area-inset-bottom)`
- Desktop: "+ New Tournament" top-right
- Name truncation: ellipsis on mobile, wrap on desktop
- Verify: keyboard navigation, screen reader, responsive at 375px/768px/1024px
