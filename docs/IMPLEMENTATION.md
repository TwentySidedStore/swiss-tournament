# Implementation Spec

Execution guide for building Twenty Sided Swiss. Read `PLAN.md` first for the design spec. This document covers the _how_: file structure, function signatures, reducer actions, component props, and test plan.

TDD approach: for each build step, write tests first, then implement to pass.

---

## Project Structure

```
swiss-tournament/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── engine/
│   │   ├── stats.js
│   │   ├── stats.test.js
│   │   ├── pairing.js
│   │   ├── pairing.test.js
│   │   ├── roundCount.js
│   │   └── roundCount.test.js
│   ├── state/
│   │   ├── reducer.js
│   │   ├── reducer.test.js
│   │   ├── actions.js
│   │   └── persistence.js
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── PlayerPanel.jsx
│   │   ├── registration/
│   │   │   ├── Registration.jsx
│   │   │   ├── PlayerInput.jsx
│   │   │   ├── PlayerList.jsx
│   │   │   ├── BulkAdd.jsx
│   │   │   └── RoundCountSelector.jsx
│   │   ├── tournament/
│   │   │   ├── Tournament.jsx
│   │   │   ├── TabBar.jsx
│   │   │   ├── RoundsTab.jsx
│   │   │   ├── RoundNav.jsx
│   │   │   ├── MatchCard.jsx
│   │   │   ├── ScoreEntry.jsx
│   │   │   ├── RoundControls.jsx
│   │   │   └── PairingEditor.jsx
│   │   ├── standings/
│   │   │   └── StandingsTable.jsx
│   │   └── ui/
│   │       ├── Modal.jsx
│   │       └── ConfirmDialog.jsx
│   └── styles/
│       └── tokens.css
├── index.html
├── package.json
├── vite.config.js
├── CLAUDE.md
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml
```

Tests co-located with source files.

---

## 1. Engine Functions

All engine functions are pure — no React, no side effects. Import and test in isolation.

### Constants

```js
// engine/pairing.js
export const BYE_PHANTOM = { id: 'BYE_PHANTOM', name: 'BYE' }
```

`BYE_PHANTOM` is a sentinel used by the pairing algorithm. Its match points are always computed as -Infinity by the sort (not stored on the object). Its `id` is a string constant used in the faced map — players who have had a bye have `'BYE_PHANTOM'` in their faced set. Defined once, imported wherever needed.

### `deriveResult(games)`

```js
// engine/stats.js
deriveResult({ p1Wins, p2Wins, draws }) → "p1_win" | "p2_win" | "draw" | null
```

| Input | Output | Why |
|---|---|---|
| `{ 0, 0, 0 }` | `null` | No games recorded — no result |
| `{ 2, 0, 0 }` | `"p1_win"` | P1 has more wins |
| `{ 0, 2, 0 }` | `"p2_win"` | P2 has more wins |
| `{ 2, 1, 0 }` | `"p1_win"` | P1 has more wins |
| `{ 1, 2, 0 }` | `"p2_win"` | P2 has more wins |
| `{ 1, 1, 0 }` | `"draw"` | Equal wins, at least 1 game |
| `{ 1, 1, 1 }` | `"draw"` | Equal wins |
| `{ 0, 0, 3 }` | `"draw"` | Zero wins each, but games recorded |
| `{ 1, 0, 5 }` | `"p1_win"` | P1 has more wins |
| `{ 1, 0, 0 }` | `"p1_win"` | Best-of-1 |
| `{ 0, 1, 0 }` | `"p2_win"` | Best-of-1 |

**Critical rule:** `{ 0, 0, 0 }` is `null`, not `"draw"`. This prevents all matches from starting as draws. A TO must explicitly enter at least one game result (including a drawn game via [+Draw]) for the match to have a result.

### `computePlayerStats(players, rounds)`

```js
// engine/stats.js
computePlayerStats(players, rounds) → Map<playerId, PlayerStats>

PlayerStats = {
  matchRecord: { w, l, d },
  gameRecord: { w, l, d },
  matchPoints,      // matchW × 3 + matchD × 1
  gamePoints,       // gameW × 3 + gameD × 1
  gamesPlayed,      // sum of p1Wins + p2Wins + draws across all matches
  opponents: [],    // IDs of real opponents (excludes byes/assigned_losses)
  hasBye: boolean,
  roundsCompleted,  // number of rounds with any result (includes byes/assigned_losses)
}
```

Walk `rounds[].matches[]`. For each match, determine which side the player is on (p1 or p2), derive the result, accumulate records. Byes and assigned losses have `player2Id: null` — the player is always p1.

**Every player in `players` gets an entry**, even if they have no matches yet (zero stats across the board). This ensures downstream lookups never fail for players who haven't played yet (e.g., standings before any results are entered).

**Test cases:**
- Player wins 2-0 → matchRecord { w:1, l:0, d:0 }, gameRecord { w:2, l:0, d:0 }, gamesPlayed: 2
- Player loses 1-2 → matchRecord { w:0, l:1, d:0 }, gameRecord { w:1, l:2, d:0 }, gamesPlayed: 3
- Player draws 1-1-1 → matchRecord { w:0, l:0, d:1 }, gameRecord { w:1, l:1, d:1 }, gamesPlayed: 3
- Bye → matchRecord { w:1, l:0, d:0 }, gameRecord { w:2, l:0, d:0 }, gamesPlayed: 2, hasBye: true, opponents excludes bye
- Assigned loss → matchRecord { w:0, l:1, d:0 }, gameRecord { w:0, l:2, d:0 }, gamesPlayed: 2, opponents excludes loss
- Multi-round accumulation (2 matches across 2 rounds)
- Late entrant: 2 assigned losses + 1 real match → roundsCompleted: 3, gamesPlayed: 6
- Player with no matches yet → all zeros, empty opponents, roundsCompleted: 0

### `computeTiebreakers(playerStatsMap)`

```js
// engine/stats.js
computeTiebreakers(playerStatsMap) → Map<playerId, Tiebreakers>

Tiebreakers = {
  mwp,   // Match-Win Percentage (floored at 0.33, or 0 if no rounds)
  gwp,   // Game-Win Percentage (floored at 0.33, or 0 if no games)
  omwp,  // Opponents' Match-Win Percentage
  ogwp,  // Opponents' Game-Win Percentage
}
```

**Two-pass computation:**
1. Compute all players' MWP and GWP.
2. For each player, compute OMWP and OGWP by averaging their opponents' (already computed) MWP/GWP with per-opponent 0.33 floor.

**Test cases:**
- MWP: 3 match points / (3 × 1 round) = 1.0000
- MWP: 0 match points / (3 × 2 rounds) = 0.0000 → floored to 0.3300
- MWP: 0 rounds → 0
- GWP: 6 game points / (3 × 2 games) = 1.0000
- GWP: with draws — (3+1) / (3×3) = 0.4444
- GWP: 0 games → 0
- OMWP: average of opponents' MWP, each floored at 0.33
- OMWP: no real opponents (only byes) → 0
- OGWP: same as OMWP but with GWP
- Full scenario: 4 players, 2 rounds, verify all tiebreakers

### `sortStandings(players, statsMap, tiebreakersMap)`

```js
// engine/stats.js
sortStandings(
  players: Player[],
  statsMap: Map<playerId, PlayerStats>,
  tiebreakersMap: Map<playerId, Tiebreakers>
) → [{ player, stats, tiebreakers, rank }]
```

Sort by: match points desc → OMWP desc → GWP desc → OGWP desc → player ID asc.
Assign ranks. Tied players share a rank (same match points + all four tiebreakers identical).

**Test cases:**
- Sort by match points
- Tie broken by OMWP
- Tie broken by GWP
- Tie broken by OGWP
- Final tie broken by ID (stable)
- Shared ranks for identical tiebreakers

### `recommendedRounds(playerCount)`

```js
// engine/roundCount.js
recommendedRounds(n) → number  // ceil(log2(n))
```

| Input | Output |
|---|---|
| 2 | 1 |
| 3 | 2 |
| 4 | 2 |
| 5 | 3 |
| 8 | 3 |
| 9 | 4 |
| 16 | 4 |
| 256 | 8 |

### `defaultRounds(playerCount)`

```js
// engine/roundCount.js
defaultRounds(n) → number  // min(3, recommendedRounds(n))
```

### `generateRound1Pairings(players, startMatchId)`

```js
// engine/pairing.js
generateRound1Pairings(players, startMatchId) → { matches: Match[], nextMatchId: number }
```

1. Shuffle players randomly.
2. If odd, append BYE_PHANTOM.
3. Pair sequentially: [0,1], [2,3], etc.
4. Convert BYE_PHANTOM pairs to bye matches.

Each match gets a unique `id` starting from `startMatchId`. Returns the updated `nextMatchId` so the reducer can store it.

**Test cases:**
- Even players: all normal matches, no bye
- Odd players: one bye match, bye player is last after shuffle
- 2 players: one match
- Resulting matches have correct structure (`{ id, player1Id, player2Id, type, games }`)
- Match IDs are sequential starting from startMatchId

### `generateRoundNPairings(players, completedRounds, startMatchId)`

```js
// engine/pairing.js
generateRoundNPairings(players, completedRounds, startMatchId) → { matches: Match[], nextMatchId: number }
```

Computes player stats internally (imports `computePlayerStats` from stats engine) — no need for the caller to pass a pre-computed stats map.

Full algorithm per PLAN.md:
1. Build pool (+ BYE_PHANTOM if odd)
2. Build faced map from completed rounds
3. Sort by match points desc (computed internally), shuffle within groups, BYE_PHANTOM at bottom (-Infinity)
4. Backtracking pairer
5. Fallback: if backtracking returns null, re-run without constraints (allow rematches)

Always returns matches — never null. The fallback guarantees pairings are always produced. Rematches in the fallback are visible in the pairing editor via inline rematch warnings (no separate warning mechanism needed). Returns `nextMatchId` for the reducer to store.

**Test cases:**
- 4 players, round 2: no rematches
- 6 players, round 2: bye goes to lowest without bye
- Bye constraint: lowest player already had bye → next lowest gets it
- Double bye constraint: two lowest both had byes → bye floats up
- Backtracking needed: forced by rematch constraint
- Fallback path: construct a scenario where no valid pairing exists, verify rematches are allowed
- Large pool (16+ players): completes without error

### `buildFacedMap(completedRounds)`

```js
// engine/pairing.js
buildFacedMap(completedRounds) → Map<id, Set<id>>
```

Walk all matches in completed rounds. For normal matches, add each player to the other's set. For byes, add `BYE_PHANTOM.id` to the player's set. Assigned losses have no opponent — nothing added.

Parameter is named `completedRounds` (not `rounds`) to clarify it excludes the current in-progress round.

---

## 2. Reducer

### Initial State

```js
{
  players: [],
  rounds: [],
  nextId: 1,                // autoincrement counter for player IDs
  nextMatchId: 1,           // autoincrement counter for match IDs
  activeRound: null,
  viewingRound: null,
  currentTab: "rounds",
  tournamentStarted: false,
  tournamentComplete: false,
  maxRounds: null,
  tournamentName: "",
  tournamentDate: new Date().toISOString().split('T')[0],  // auto-filled to today
}
```

`nextId` and `nextMatchId` are autoincrement counters stored in state and persisted to localStorage. Every ADD_PLAYER, BULK_ADD_PLAYERS, and ADD_LATE_PLAYER uses `nextId` for the new player's ID, then increments. Every match creation (pairing generation, bye insertion, assigned loss insertion) uses `nextMatchId`, then increments. This guarantees unique IDs even after player removals.

### Action Types

```js
// state/actions.js
export const Actions = {
  ADD_PLAYER:         'ADD_PLAYER',
  REMOVE_PLAYER:      'REMOVE_PLAYER',
  BULK_ADD_PLAYERS:   'BULK_ADD_PLAYERS',
  SET_TOURNAMENT_NAME:'SET_TOURNAMENT_NAME',
  SET_TOURNAMENT_DATE:'SET_TOURNAMENT_DATE',
  START_TOURNAMENT:   'START_TOURNAMENT',
  SET_VIEWING_ROUND:  'SET_VIEWING_ROUND',
  SET_TAB:            'SET_TAB',
  SET_MATCH_RESULT:   'SET_MATCH_RESULT',
  COMPLETE_ROUND:     'COMPLETE_ROUND',
  DELETE_ROUND:       'DELETE_ROUND',
  FINISH_TOURNAMENT:  'FINISH_TOURNAMENT',
  REOPEN_TOURNAMENT:  'REOPEN_TOURNAMENT',
  ADD_LATE_PLAYER:    'ADD_LATE_PLAYER',
  SAVE_PAIRINGS:      'SAVE_PAIRINGS',
  NEW_TOURNAMENT:     'NEW_TOURNAMENT',
}
```

### Action Payloads and Reducer Behavior

**ADD_PLAYER** `{ name: string }`
- Append `{ id: state.nextId, name }` to `players[]`. Increment `nextId`.
- Guard: `players.length < 256`

**REMOVE_PLAYER** `{ playerId: number }`
- Filter out from `players[]`
- Guard: only during registration (`!tournamentStarted`)

**BULK_ADD_PLAYERS** `{ names: string[] }`
- Append each as a new player with sequential IDs starting from `state.nextId`. Increment `nextId` by `names.length`.
- Guard: `players.length + names.length <= 256`

**SET_TOURNAMENT_NAME** `{ name: string }`
**SET_TOURNAMENT_DATE** `{ date: string }`

**START_TOURNAMENT** `{ maxRounds: number }`
- `tournamentStarted: true`
- `maxRounds` set
- `activeRound: 0`, `viewingRound: 0`
- Generate Round 1 pairings → push to `rounds[]`. Each match gets an ID from `nextMatchId`.
- Guard: `players.length >= 2`, `maxRounds >= 1 && maxRounds <= recommendedRounds(players.length)`

**SET_VIEWING_ROUND** `{ index: number }`
- Guard: `0 <= index < rounds.length`

**SET_TAB** `{ tab: "rounds" | "standings" }`

**SET_MATCH_RESULT** `{ matchId: number, games: { p1Wins, p2Wins, draws } }`
- Find the match by `matchId` across all rounds. Update its `games`.
- Guard: match type is `"normal"` (can't edit byes/assigned_losses)
- **No locked-round guard.** Scores are always editable on any round, locked or not. This is intentional per PLAN.md.

**COMPLETE_ROUND** (no payload)
- Guard: `activeRound !== null && activeRound < maxRounds - 1` (not the final round — use FINISH_TOURNAMENT for that). If dispatched on the final round, ignore / no-op.
- Lock current active round (`rounds[activeRound].locked = true`)
- Generate next round pairings (using `generateRoundNPairings`), push to `rounds[]`
- Advance `activeRound` and `viewingRound`
- Auto-switch `currentTab` to `"rounds"`

**DELETE_ROUND** (no payload)
- If `tournamentComplete`: set `tournamentComplete: false`, unlock last round. Equivalent to REOPEN_TOURNAMENT + DELETE_ROUND, but handled as one action to avoid double-dispatch.
- If Round 1 (`rounds.length === 1`): `tournamentStarted: false`, empty `rounds[]`, `activeRound: null`, `viewingRound: null`, `maxRounds: null`. Players preserved.
- If Round 2+ (`rounds.length > 1`): pop `rounds[]`, decrement `activeRound`, set `viewingRound` to new active, unlock the now-active round (`locked: false`).

**FINISH_TOURNAMENT** (no payload)
- Lock final round (`rounds[activeRound].locked = true`)
- `tournamentComplete: true`
- Switch `currentTab` to `"standings"`

**REOPEN_TOURNAMENT** (no payload)
- `tournamentComplete: false`
- Switch `currentTab` to `"rounds"`
- Everything else stays the same (rounds, scores, pairings all preserved). TO can edit scores on any round (already possible), then re-finish when done.

**ADD_LATE_PLAYER** `{ name: string, currentRoundAction: "pair_with_bye" | "award_bye" | "assign_loss" }`
- Create player (`{ id: state.nextId, name }`). Increment `nextId`.
- For each locked round: insert assigned_loss match (using `nextMatchId`).
- For current active round, based on `currentRoundAction`:
  - `"pair_with_bye"`: search `rounds[activeRound].matches` for the match with `type === "bye"`. Convert it to a normal match: set `player2Id` to the new player's ID, `type: "normal"`, reset `games: { p1Wins: 0, p2Wins: 0, draws: 0 }`. (If no bye exists, this is a no-op — the UI should not offer this option when there's no bye.)
  - `"award_bye"`: insert bye match for new player (using `nextMatchId`).
  - `"assign_loss"`: insert assigned_loss match for new player (using `nextMatchId`).

**SAVE_PAIRINGS** `{ roundIndex: number, matches: Match[] }`
- Replace `rounds[roundIndex].matches` with new pairings
- Guard: round not locked

**NEW_TOURNAMENT** (no payload)
- Reset to initial state (all defaults, `nextId: 1`, `nextMatchId: 1`, `tournamentDate` set to today)

### Match Data Model (in state)

```js
{
  id: number,                         // unique, from nextMatchId
  player1Id: number,
  player2Id: number | null,           // null for bye/assigned_loss
  type: "normal" | "bye" | "assigned_loss",
  games: { p1Wins: 0, p2Wins: 0, draws: 0 }
}
```

`result` is **not stored** — derived via `deriveResult(match.games)` wherever needed.

Match `id` is used for:
- React `key` prop in match card lists (stable across re-renders)
- `SET_MATCH_RESULT` targeting (find match by ID, not fragile array index)
- Debugging (readable in localStorage)

### Reducer Test Cases

- ADD_PLAYER: adds player with correct ID, increments nextId
- ADD_PLAYER: rejects at 256
- REMOVE_PLAYER: removes correct player
- REMOVE_PLAYER: rejects during tournament
- BULK_ADD_PLAYERS: adds multiple, IDs are sequential
- START_TOURNAMENT: sets all state fields, generates round 1 with match IDs
- SET_MATCH_RESULT: updates games by matchId, rejects for byes
- SET_MATCH_RESULT: succeeds on a locked round (no lock guard)
- COMPLETE_ROUND: locks round, generates next, advances activeRound
- COMPLETE_ROUND: no-op on final round (must use FINISH_TOURNAMENT)
- DELETE_ROUND (round 1): returns to registration, preserves players
- DELETE_ROUND (round 2+): pops round, unlocks previous
- DELETE_ROUND (after FINISH_TOURNAMENT): reopens + deletes
- FINISH_TOURNAMENT: locks final round, sets tournamentComplete
- REOPEN_TOURNAMENT: clears tournamentComplete, switches to rounds tab
- ADD_LATE_PLAYER with pair_with_bye: finds bye match, converts to normal
- ADD_LATE_PLAYER with pair_with_bye when no bye exists: no-op for current round
- ADD_LATE_PLAYER with assign_loss: inserts assigned_loss for all rounds
- SAVE_PAIRINGS: replaces matches, rejects if round locked
- NEW_TOURNAMENT: full reset
- Full flow: register 8 → start → score R1 → complete → score R2 → complete → score R3 → finish → reopen → edit score → re-finish

---

## 3. Components

### Hierarchy

```
App
├── Header
│   └── PlayerPanel (modal, opened via "Players (N)" button)
├── Registration (when !tournamentStarted)
│   ├── PlayerInput
│   ├── BulkAdd
│   ├── PlayerList
│   └── RoundCountSelector (modal, opened via "Start Tournament")
├── Tournament (when tournamentStarted)
│   ├── TabBar
│   ├── RoundsTab (when currentTab === "rounds")
│   │   ├── RoundNav
│   │   ├── MatchCard (× N)
│   │   │   └── ScoreEntry (when expanded)
│   │   ├── RoundControls
│   │   └── PairingEditor (when editingPairings)
│   └── StandingsTab (when currentTab === "standings")
│       └── StandingsTable
└── Footer
```

### Component Specs

**App.jsx**
- Owns `useReducer(tournamentReducer, initialState)`
- `useEffect` to persist state to localStorage on every state change
- On mount: load from localStorage via `persistence.js`, show recovery banner if data found
- Computes derived data via `useMemo`: `playerStats`, `tiebreakers`, `standings` (from stats engine, keyed on `state.rounds`)
- Passes `state`, `dispatch`, and derived data down via props (or context if prop drilling gets deep)

**Header.jsx**
```
Props: tournamentName, tournamentStarted, tournamentComplete, playerCount,
       onNewTournament, onPrint
Local state: playerPanelOpen (boolean) — controls PlayerPanel visibility
```
- Shows "Twenty Sided Swiss" in Cinzel
- Tournament name when active
- "Players (N)" button → toggles `playerPanelOpen`, renders PlayerPanel
- [Print] button
- [New Tournament] with confirmation if in progress

**Footer.jsx**
```
No props — static content
```
- "Twenty Sided Store · View source on GitHub"
- Link: https://github.com/TwentySidedStore/swiss-tournament

**PlayerPanel.jsx**
```
Props: players, playerStats, isOpen, onClose, onAddLatePlayer,
       tournamentStarted, activeRoundHasBye: boolean
```
- Modal/slide-out. Player list with records (read-only during tournament).
- [+ Add Player] input at top. During tournament, triggers late addition flow:
  - Shows inline options based on `activeRoundHasBye`:
    - If true: [Pair with Bye Player] | [Award Bye] | [Assign Loss]
    - If false: [Award Bye] | [Assign Loss]
  - Calls `onAddLatePlayer({ name, currentRoundAction })`.
- `activeRoundHasBye` is computed by the parent: `rounds[activeRound].matches.some(m => m.type === 'bye')`.

**Registration.jsx**
```
Props: players, tournamentName, tournamentDate, dispatch
Local state: showRoundSelector (boolean) — controls RoundCountSelector modal
```
- Renders PlayerInput, PlayerList, BulkAdd
- Tournament name/date fields (dispatch SET_TOURNAMENT_NAME / SET_TOURNAMENT_DATE)
- Start Tournament button (disabled if < 2 players). Click sets `showRoundSelector: true`.
- When `showRoundSelector`: renders RoundCountSelector modal. On confirm: dispatches START_TOURNAMENT, sets `showRoundSelector: false`. On cancel: sets `showRoundSelector: false`.
- Empty states: 0 players → "Add players to begin." 1 player → "Add at least 2 players to start."

**PlayerInput.jsx**
```
Props: onAdd: (name: string) => void, disabled: boolean, placeholder: string
```
- Text input + Add button. Enter key submits. Clears input after add.

**PlayerList.jsx**
```
Props: players: Player[], onRemove: (playerId: number) => void, readOnly: boolean
```
- List of player names with remove buttons (hidden if readOnly)

**BulkAdd.jsx**
```
Props: onBulkAdd: (names: string[]) => void
Local state: isOpen (boolean), text (string)
```
- "Bulk Add" link → textarea → "Add N Players" button. Parses newlines, trims, skips blanks.

**RoundCountSelector.jsx**
```
Props: playerCount: number, onConfirm: (maxRounds: number) => void, onCancel: () => void
Local state: selectedRounds (number) — stepper value
```
- Modal (uses Modal.jsx). Stepper for round count.
- Initial value: `defaultRounds(playerCount)`. Min: 1. Max: `recommendedRounds(playerCount)`.
- Note for 2-player events: stepper is stuck at 1 (correct — both default and max are 1).

**Tournament.jsx**
```
Props: state, dispatch, playerStats, tiebreakers, standings
```
- Thin wrapper. Renders TabBar + conditionally renders RoundsTab or StandingsTab based on `state.currentTab`.

**TabBar.jsx**
```
Props: currentTab: string, activeRound: number, onTabChange: (tab: string) => void
```
- Two tabs: Rounds [N] | Standings
- `role="tablist"`, `aria-selected`

**RoundsTab.jsx**
```
Props: state, dispatch, playerStats
Local state: expandedMatchId (number | null) — which match is expanded
```
- Owns `expandedMatchId` via `useState(null)`. Resets to `null` when `state.viewingRound` changes (via `useEffect`).
- Passes `isExpanded={match.id === expandedMatchId}` and `onToggleExpand` to each MatchCard.
- Only one match expanded at a time: clicking a new card collapses the old one.
- Renders: RoundNav, MatchCard list, RoundControls. Conditionally renders PairingEditor.
- Computes `incompleteCount` from current round's matches: count of normal matches where `deriveResult(match.games) === null`.

**RoundNav.jsx**
```
Props: viewingRound: number, totalRounds: number, activeRound: number,
       onNavigate: (index: number) => void
```
- `← Round X of Y →`
- Arrows disabled at boundaries
- "ACTIVE" badge when viewing the active round

**MatchCard.jsx**
```
Props: match: Match, player1: Player, player2: Player | null,
       p1Stats: PlayerStats, p2Stats: PlayerStats | null,
       isExpanded: boolean, onToggleExpand: () => void,
       onSetGames: (games) => void
```
- Compact view: player names (with W-L-D records from stats), game score, left-border status
- Expanded view: renders ScoreEntry
- Read-only for byes and assigned_losses (badge, no expand)
- `onSetGames` dispatches `SET_MATCH_RESULT` with this match's `id`

**ScoreEntry.jsx**
```
Props: games: { p1Wins, p2Wins, draws }, onSetGames: (games) => void
```
- Row 1: [2-0] [2-1] [1-0] [1-1] [0-1] [1-2] [0-2]
- Row 2: [+Draw] [Reset]
- Preset click → `onSetGames({ p1Wins, p2Wins, draws: 0 })`
- [+Draw] → `onSetGames({ ...games, draws: games.draws + 1 })`
- [Reset] → `onSetGames({ p1Wins: 0, p2Wins: 0, draws: 0 })`
- Active button highlighted (gold bg + bold, not color alone)

**RoundControls.jsx**
```
Props: roundNumber: number, isActiveRound: boolean, incompleteCount: number,
       isLastRound: boolean, tournamentComplete: boolean,
       onCompleteRound: () => void, onDeleteRound: () => void,
       onFinishTournament: () => void, onReopenTournament: () => void,
       onEditPairings: () => void, canEditPairings: boolean
```
- When `tournamentComplete`: shows "Reopen Tournament" button (small, subtle).
- When `isLastRound && !tournamentComplete`: "Finish Tournament" / "Finish Tournament (M incomplete)". Uses ConfirmDialog: "Complete Round?"
- When `!isLastRound`: "Start Round N" / "Start Round N (M incomplete)". Uses ConfirmDialog: "Complete Round?"
- "Delete Round" (small, subdued). Uses ConfirmDialog with `requireTyping: "DELETE"`: "Delete Round and entered results?"
- "Edit Pairings" shown when `canEditPairings` is true (round not locked + no normal results entered).
- Only visible when `isActiveRound`.
- `incompleteCount` is computed by parent (RoundsTab) and passed as a prop.

**PairingEditor.jsx**
```
Props: round: Round, players: Player[], playerStats: Map, completedRounds: Round[],
       onSave: (matches: Match[]) => void, onCancel: () => void
Local state: workingPairings, unpairedPlayers, selectedPlayerId
```
- Two-panel: unpaired players | current pairings.
- Break → unpaired. Click-to-pair with sticky selection chip.
- Rematch warnings (inline amber) — uses `buildFacedMap(completedRounds)` to check.
- **"Reset to Auto" calls engine directly**: imports `generateRoundNPairings` (or `generateRound1Pairings` for R1) and resets working state. This is the simplest approach — the engine functions are pure and cheap.
- [Save] calls `onSave(workingMatches)` which dispatches `SAVE_PAIRINGS`. [Cancel] calls `onCancel`.

**StandingsTable.jsx**
```
Props: standings: [{ player, stats, tiebreakers, rank }],
       tournamentComplete: boolean, tournamentName: string, tournamentDate: string,
       onNewTournament: () => void, onReopenTournament: () => void
Local state: sortByName (boolean) — toggles between tiebreaker sort and name sort
```
- Semantic `<table>`. Sticky header. Sticky rank+name on mobile.
- JetBrains Mono for tiebreaker columns.
- `sortByName` is local `useState(false)`. When true, re-sorts standings by player name. Column header clickable with `aria-sort`.
- Empty state: "Standings update as results are entered."
- Tournament complete: banner with name/date, [New Tournament] button, [Reopen Tournament] button (subtle).

**Modal.jsx**
```
Props: isOpen: boolean, onClose: () => void, title: string, children: ReactNode
```
- Focus trap, Escape to close, backdrop click to close
- `aria-modal`, `role="dialog"`

**ConfirmDialog.jsx**
```
Props: isOpen: boolean, message: string, confirmLabel: string,
       onConfirm: () => void, onCancel: () => void,
       requireTyping: string | null
```
- If `requireTyping` set: text input that must match (e.g., "DELETE")
- Confirm button disabled until match (or enabled immediately if `requireTyping` is null)
- Uses Modal.jsx internally

---

## 4. Test Plan

### Unit Tests (TDD — write before implementing)

**engine/stats.test.js**
- `deriveResult`: all 11 cases from the table above
- `computePlayerStats`: win, loss, draw, bye, assigned_loss, multi-round, late entrant, player with no matches, gamesPlayed accuracy (9+ cases)
- `computeTiebreakers`: MWP floor, MWP zero rounds, GWP with draws, GWP zero games, OMWP with floor per opponent, OMWP no real opponents, OGWP, full 4-player 2-round scenario (10+ cases)
- `sortStandings`: sort by points, tie broken by OMWP/GWP/OGWP/ID, shared ranks (6+ cases)

**engine/pairing.test.js**
- `generateRound1Pairings`: even players, odd players, 2 players, match IDs assigned (4 cases)
- `generateRoundNPairings`: no rematches, bye to lowest, bye constraint, double bye constraint, backtracking, fallback path (rematches allowed), 16+ players (7+ cases)
- `buildFacedMap`: basic two-player, with byes, with assigned losses (3 cases)

**engine/roundCount.test.js**
- `recommendedRounds`: all 8 breakpoints
- `defaultRounds`: capped at 3, matches recommended for small events (3+ cases)

**state/reducer.test.js**
- ADD_PLAYER: correct ID + nextId increment, rejects at 256 (2 cases)
- REMOVE_PLAYER: removes player, rejects during tournament (2 cases)
- BULK_ADD_PLAYERS: sequential IDs, rejects at 256 (2 cases)
- START_TOURNAMENT: all state fields set, round 1 generated, match IDs assigned (1 case)
- SET_MATCH_RESULT: updates by matchId, rejects for byes, succeeds on locked round (3 cases)
- COMPLETE_ROUND: locks round, generates next, no-op on final round (2 cases)
- DELETE_ROUND: round 1 → registration, round 2+ → pop + unlock, after finish → reopen + pop (3 cases)
- FINISH_TOURNAMENT: locks final, sets complete (1 case)
- REOPEN_TOURNAMENT: clears complete, switches tab (1 case)
- ADD_LATE_PLAYER: pair_with_bye (converts bye), pair_with_bye when no bye (no-op), assign_loss (all rounds) (3 cases)
- SAVE_PAIRINGS: replaces matches, rejects if locked (2 cases)
- NEW_TOURNAMENT: full reset (1 case)
- Full tournament flow: register → start → score → complete → score → finish → reopen → edit → re-finish (1 comprehensive case)

**Total: ~60+ unit test cases**

### Component Tests (after implementation)

**Registration.test.jsx**
- Renders empty state
- Add player via input
- Remove player
- Bulk add
- Start Tournament disabled at < 2 players
- Round count selector appears on Start Tournament

**MatchCard.test.jsx**
- Renders compact with player names and records
- Expands on click
- Score entry buttons update games
- Bye card is read-only
- Left border color matches status

**StandingsTable.test.jsx**
- Renders all columns
- Sorts correctly
- Sort by name toggle works
- Shows tournament complete banner
- Empty state

### Integration Tests

**Full tournament flow** (RTL, single test):
1. Add 4 players
2. Start tournament (2 rounds)
3. Enter all R1 results
4. Complete R1
5. Verify R2 pairings (no rematches)
6. Enter all R2 results
7. Finish tournament
8. Verify final standings sort order

**Late player addition** (RTL):
1. Start 3-player tournament (2 rounds)
2. Enter R1 results, complete R1
3. Add late player during R2 (pair with bye)
4. Enter R2 results, finish
5. Verify late player has assigned loss for R1 + real match for R2

**Delete round** (RTL):
1. Start 4-player tournament
2. Enter R1 results, complete R1
3. Delete R2
4. Verify R1 is unlocked, results preserved
5. Re-complete R1, verify new R2 generated

---

## 5. Build Sequence

Each step: write tests → implement → verify tests pass → commit.

### Step 1: Project Setup
**Files:** `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/styles/tokens.css`, `src/components/ui/Modal.jsx`, `src/components/ui/ConfirmDialog.jsx`, `.github/workflows/deploy.yml`
- Init project, install: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Tailwind v4 uses CSS-based config via `@theme` in `tokens.css` — no `tailwind.config.js` or `postcss.config.js` needed
- Color tokens, fonts, and theme defined in `src/styles/tokens.css`
- Google Fonts in `index.html`
- `vite.config.js`: `base: '/swiss-tournament/'`, `test: { environment: 'jsdom' }`
- Build Modal.jsx and ConfirmDialog.jsx early — they're needed by Step 3 (RoundCountSelector) and Step 9+ (confirmations)
- GitHub Actions deploy workflow
- Verify: `npm run dev` shows blank app, `npm run build` succeeds, `npm test` runs (no tests yet)

### Step 2: State Management
**Tests first:** `src/state/reducer.test.js` — all action tests except COMPLETE_ROUND pairing (use stub)
**Files:** `src/state/actions.js`, `src/state/reducer.js`, `src/state/persistence.js`, `src/App.jsx`
- Action constants
- Reducer with all actions. `START_TOURNAMENT` and `COMPLETE_ROUND` use stub pairing (return dummy matches) for now — real pairing wired in Steps 4 and 8.
- `persistence.js`: `saveState(state)` → `JSON.stringify` to localStorage. `loadState()` → `JSON.parse` from localStorage. No ephemeral field stripping needed — `editingPairings` and `expandedMatchId` are component-local state, never in the reducer.
- App.jsx wires up `useReducer` + persistence `useEffect`
- Verify: all reducer tests pass

### Step 3: Registration UI
**Files:** `src/components/registration/*.jsx`, `src/components/Header.jsx`, `src/components/Footer.jsx`
- Header with app name + footer with GitHub link
- PlayerInput, PlayerList, BulkAdd, Registration (with `showRoundSelector` local state)
- RoundCountSelector modal (uses Modal.jsx from Step 1)
- Empty states
- Verify: can add/remove players, start tournament in browser

### Step 4: Match Cards + Round Nav
**Tests first:** `src/engine/pairing.test.js` (Round 1 only), `src/engine/roundCount.test.js`
**Files:** `src/engine/pairing.js` (Round 1 + BYE_PHANTOM constant), `src/engine/roundCount.js`, `src/components/tournament/Tournament.jsx`, `src/components/tournament/RoundsTab.jsx`, `src/components/tournament/RoundNav.jsx`, `src/components/tournament/MatchCard.jsx`, `src/components/tournament/TabBar.jsx`
- Round 1 pairing algorithm with match ID generation
- Round count functions
- Wire `START_TOURNAMENT` in reducer to real `generateRound1Pairings`
- Tournament.jsx (tab switching wrapper), RoundsTab.jsx (owns `expandedMatchId`), TabBar, RoundNav, compact MatchCard
- Verify: start tournament shows match cards with round nav

### Step 5: Stats Engine
**Tests first:** `src/engine/stats.test.js` (all unit tests)
**Files:** `src/engine/stats.js`
- `deriveResult`, `computePlayerStats`, `computeTiebreakers`, `sortStandings`
- Wire into App.jsx via `useMemo` keyed on `state.rounds`
- Verify: all stats tests pass

### Step 6: Score Entry
**Files:** `src/components/tournament/ScoreEntry.jsx`, update MatchCard.jsx, update RoundsTab.jsx
- Expanded card with preset buttons + [+Draw] + [Reset]
- MatchCard shows player records from stats engine
- `SET_MATCH_RESULT` dispatched with `matchId`
- Left-border status colors
- Verify: can enter scores, records update live, only one card expanded at a time

### Step 7: Standings Table
**Files:** `src/components/standings/StandingsTable.jsx`
- Semantic table, sticky header, mobile sticky columns
- Tiebreakers from stats engine
- Sortable by name (`sortByName` local state)
- Empty state
- Verify: standings update as scores are entered

### Step 8: Rounds 2+ Pairing
**Tests first:** `src/engine/pairing.test.js` (rounds 2+ tests including fallback)
**Files:** update `src/engine/pairing.js`, wire into reducer
- `generateRoundNPairings` with phantom BYE + backtracking + fallback
- `buildFacedMap`
- Wire `COMPLETE_ROUND` in reducer to use `generateRoundNPairings`
- Verify: round 2 generates valid pairings, no rematches, fallback tested

### Step 9: Round Completion + Finish
**Files:** `src/components/tournament/RoundControls.jsx`
- "Start Round N" with incomplete count from RoundsTab
- "Complete Round?" confirmation via ConfirmDialog
- "Finish Tournament" flow via ConfirmDialog
- "Reopen Tournament" button on completion banner
- Tournament complete banner on StandingsTable
- Verify: full tournament lifecycle works (complete → finish → reopen → re-finish)

### Step 10: Delete Round
**Files:** update RoundControls
- "Delete Round" button with ConfirmDialog (`requireTyping: "DELETE"`)
- `DELETE_ROUND` reducer action handles all cases (R1, R2+, after finish)
- Verify: delete round, previous round unlocked, R1 deletion returns to registration

### Step 11: Late Player Additions
**Files:** `src/components/PlayerPanel.jsx`, update Header.jsx, update reducer
- Player panel modal (opened from Header)
- `ADD_LATE_PLAYER` action with assigned losses
- Current-round options based on `activeRoundHasBye`
- Integration with open pairing editor (if editor open, player appears in unpaired pool instead of modal)
- Verify: add late player mid-tournament, correct assigned losses

### Step 12: Manual Pairing Override
**Files:** `src/components/tournament/PairingEditor.jsx`, update RoundsTab
- Break + rebuild two-panel layout (single column on mobile)
- Sticky selection chip
- Rematch warnings via `buildFacedMap`
- "Reset to Auto" calls engine directly
- Save/Cancel
- `editingPairings` as local state in RoundsTab (boolean, controls PairingEditor visibility)
- Verify: break pairing, create new, rematch warning, reset to auto, save

### Step 13: Accessibility Pass
- Verify contrast ratios (dev tools / axe extension)
- Keyboard navigate every interactive element
- Screen reader test (VoiceOver)
- ARIA attributes on all components (tablist, expanded, live regions, groups)
- Focus indicators (high-contrast outline)
- Modal focus trapping (Modal.jsx)
- `prefers-reduced-motion` respected

### Step 14: Polish
- CSS transitions (match card expand, buttons, tabs)
- Print stylesheet (`@media print`)
- Responsive verification (320px, 375px, 768px, 1024px)
- Session recovery banner (auto-dismiss 5s)
- Edge case testing (2 players, 3 players, 256 players)
- Cross-browser check (Chrome, Safari, Firefox)

---

## 6. Deployment Config

### vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/swiss-tournament/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
```

### src/test-setup.js
```js
import '@testing-library/jest-dom'
```

### .github/workflows/deploy.yml
```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test -- --run
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

Requires enabling GitHub Pages in repo settings → Source: GitHub Actions.
