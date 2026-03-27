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
│   │   │   ├── TabBar.jsx
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
├── tailwind.config.js
├── postcss.config.js
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

**Test cases:**
- Player wins 2-0 → matchRecord { w:1, l:0, d:0 }, gameRecord { w:2, l:0, d:0 }
- Player loses 1-2 → matchRecord { w:0, l:1, d:0 }, gameRecord { w:1, l:2, d:0 }
- Player draws 1-1-1 → matchRecord { w:0, l:0, d:1 }, gameRecord { w:1, l:1, d:1 }
- Bye → matchRecord { w:1, l:0, d:0 }, gameRecord { w:2, l:0, d:0 }, hasBye: true, opponents excludes bye
- Assigned loss → matchRecord { w:0, l:1, d:0 }, gameRecord { w:0, l:2, d:0 }, opponents excludes loss
- Multi-round accumulation
- Late entrant: 2 assigned losses + 1 real match → roundsCompleted: 3

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
sortStandings(players, statsMap, tiebreakersMap) → [{ player, stats, tiebreakers, rank }]
```

Sort by: match points desc → OMWP desc → GWP desc → OGWP desc → player ID asc.
Assign ranks. Tied players share a rank.

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

### `generateRound1Pairings(players)`

```js
// engine/pairing.js
generateRound1Pairings(players) → Match[]
```

1. Shuffle players randomly.
2. If odd, append BYE_PHANTOM.
3. Pair sequentially: [0,1], [2,3], etc.
4. Convert BYE_PHANTOM pairs to bye matches.

**Test cases:**
- Even players: all normal matches, no bye
- Odd players: one bye match, bye player is last after shuffle
- 2 players: one match
- Resulting matches have correct structure (`{ player1Id, player2Id, type, games }`)

### `generateRoundNPairings(players, completedRounds, playerStatsMap)`

```js
// engine/pairing.js
generateRoundNPairings(players, completedRounds, playerStatsMap) → Match[] | null
```

Full algorithm per PLAN.md:
1. Build pool (+ BYE_PHANTOM if odd)
2. Build faced map from completed rounds
3. Sort by match points desc, shuffle within groups, BYE_PHANTOM at bottom
4. Backtracking pairer
5. Fallback: if null, re-run without constraints + warning flag

Returns `null` only if even the fallback fails (shouldn't happen).

**Test cases:**
- 4 players, round 2: no rematches
- 6 players, round 2: bye goes to lowest without bye
- Bye constraint: lowest player already had bye → next lowest gets it
- Double bye constraint: two lowest both had byes → bye floats up
- Backtracking needed: forced by rematch constraint
- Large pool (16+ players): completes without error

### `buildFacedMap(rounds)`

```js
// engine/pairing.js
buildFacedMap(rounds) → Map<id, Set<id>>
```

Walk all matches. For normal matches, add each player to the other's set. For byes, add BYE_PHANTOM to the player's set.

---

## 2. Reducer

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
  ADD_LATE_PLAYER:    'ADD_LATE_PLAYER',
  SAVE_PAIRINGS:      'SAVE_PAIRINGS',
  NEW_TOURNAMENT:     'NEW_TOURNAMENT',
}
```

### Action Payloads and Reducer Behavior

**ADD_PLAYER** `{ name: string }`
- Append `{ id: nextId++, name }` to `players[]`
- Guard: `players.length < 256`

**REMOVE_PLAYER** `{ playerId: number }`
- Filter out from `players[]`
- Guard: only during registration (`!tournamentStarted`)

**BULK_ADD_PLAYERS** `{ names: string[] }`
- Append each as a new player with autoincrement ID
- Guard: total doesn't exceed 256

**SET_TOURNAMENT_NAME** `{ name: string }`
**SET_TOURNAMENT_DATE** `{ date: string }`

**START_TOURNAMENT** `{ maxRounds: number }`
- `tournamentStarted: true`
- `maxRounds` set
- `activeRound: 0`, `viewingRound: 0`
- Generate Round 1 pairings → push to `rounds[]`
- Guard: `players.length >= 2`

**SET_VIEWING_ROUND** `{ index: number }`
- Guard: `0 <= index < rounds.length`

**SET_TAB** `{ tab: "rounds" | "standings" }`

**SET_MATCH_RESULT** `{ roundIndex: number, matchIndex: number, games: { p1Wins, p2Wins, draws } }`
- Update `rounds[roundIndex].matches[matchIndex].games`
- Guard: match type is `"normal"` (can't edit byes/assigned_losses)

**COMPLETE_ROUND** (no payload)
- Lock current active round (`rounds[activeRound].locked = true`)
- If not last round: generate next round pairings, push to `rounds[]`, advance `activeRound`, set `viewingRound`
- Auto-switch tab to "rounds"

**DELETE_ROUND** (no payload)
- If Round 1: `tournamentStarted: false`, empty `rounds[]`, `activeRound: null`, `viewingRound: null`, `maxRounds: null`. Players preserved.
- If Round 2+: pop `rounds[]`, decrement `activeRound`, set `viewingRound` to new active, unlock the now-active round.

**FINISH_TOURNAMENT** (no payload)
- Lock final round
- `tournamentComplete: true`
- Switch tab to standings

**ADD_LATE_PLAYER** `{ name: string, currentRoundAction: "pair_with_bye" | "award_bye" | "assign_loss" }`
- Create player (autoincrement ID)
- For each locked round: insert assigned_loss match
- For current round, based on `currentRoundAction`:
  - `"pair_with_bye"`: find bye match, convert to normal match with new player as p2
  - `"award_bye"`: insert bye match for new player
  - `"assign_loss"`: insert assigned_loss match for new player

**SAVE_PAIRINGS** `{ roundIndex: number, matches: Match[] }`
- Replace `rounds[roundIndex].matches` with new pairings
- Guard: round not locked

**NEW_TOURNAMENT** (no payload)
- Reset to initial state (all defaults)

### Initial State

```js
{
  players: [],
  rounds: [],
  activeRound: null,
  viewingRound: null,
  currentTab: "rounds",
  tournamentStarted: false,
  tournamentComplete: false,
  maxRounds: null,
  tournamentName: "",
  tournamentDate: new Date().toISOString().split('T')[0],
}
```

### Reducer Test Cases

- ADD_PLAYER: adds player with correct ID
- ADD_PLAYER: rejects at 256
- REMOVE_PLAYER: removes correct player
- REMOVE_PLAYER: rejects during tournament
- START_TOURNAMENT: sets all state fields, generates round 1
- SET_MATCH_RESULT: updates games, rejects for byes
- COMPLETE_ROUND: locks round, generates next, advances activeRound
- COMPLETE_ROUND on final round: should use FINISH_TOURNAMENT instead
- DELETE_ROUND (round 1): returns to registration, preserves players
- DELETE_ROUND (round 2+): pops round, unlocks previous
- ADD_LATE_PLAYER with pair_with_bye: converts bye to real match
- ADD_LATE_PLAYER with assign_loss: inserts assigned_loss for all rounds
- NEW_TOURNAMENT: full reset
- Full flow: register 8 → start → score R1 → complete → score R2 → complete → score R3 → finish

---

## 3. Components

### Hierarchy

```
App
├── Header
│   └── PlayerPanel (modal/slide-out)
├── Registration (when !tournamentStarted)
│   ├── PlayerInput
│   ├── BulkAdd
│   ├── PlayerList
│   └── RoundCountSelector (modal on Start Tournament)
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
- `useEffect` to persist state to localStorage on every change
- On mount: load from localStorage, show recovery banner if data found
- Passes `state` and `dispatch` down via props (or context if deeply nested)

**Header.jsx**
```
Props: tournamentName, tournamentStarted, tournamentComplete, playerCount, onNewTournament, onPrint
```
- Shows "Twenty Sided Swiss" in Cinzel
- Tournament name when active
- "Players (N)" button → opens PlayerPanel
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
Props: players, playerStats, isOpen, onClose, onAddPlayer, tournamentStarted
```
- Modal/slide-out. Player list with records (read-only during tournament).
- [+ Add Player] input at top (triggers late addition flow)

**Registration.jsx**
```
Props: players, tournamentName, tournamentDate, dispatch
```
- Renders PlayerInput, PlayerList, BulkAdd
- Tournament name/date fields
- Start Tournament button (disabled if < 2 players)
- Empty states

**PlayerInput.jsx**
```
Props: onAdd, disabled, placeholder
```
- Text input + Add button. Enter key submits.

**PlayerList.jsx**
```
Props: players, onRemove, readOnly
```
- List of player names with remove buttons (hidden if readOnly)

**BulkAdd.jsx**
```
Props: onBulkAdd
```
- "Bulk Add" link → textarea → "Add N Players" button

**RoundCountSelector.jsx**
```
Props: playerCount, onConfirm, onCancel
```
- Modal. Stepper for round count.
- Default: `defaultRounds(playerCount)`. Max: `recommendedRounds(playerCount)`.

**TabBar.jsx**
```
Props: currentTab, activeRound, onTabChange
```
- Two tabs: Rounds [N] | Standings
- `role="tablist"`, `aria-selected`

**RoundNav.jsx**
```
Props: viewingRound, totalRounds, activeRound, onNavigate
```
- `← Round X of Y →`
- Arrows disabled at boundaries
- "ACTIVE" badge when viewing the active round

**MatchCard.jsx**
```
Props: match, player1, player2, p1Stats, p2Stats, isExpanded, onToggleExpand, onSetGames, roundLocked
```
- Compact view: player names (with W-L-D records), game score, left-border status
- Expanded view: renders ScoreEntry
- Read-only for byes and assigned_losses (badge, no expand)

**ScoreEntry.jsx**
```
Props: games, onSetGames
```
- Row 1: [2-0] [2-1] [1-0] [1-1] [0-1] [1-2] [0-2]
- Row 2: [+Draw] [Reset]
- Preset click → `onSetGames({ p1Wins, p2Wins, draws: 0 })`
- [+Draw] → `onSetGames({ ...games, draws: games.draws + 1 })`
- [Reset] → `onSetGames({ p1Wins: 0, p2Wins: 0, draws: 0 })`
- Active button highlighted (gold bg + bold, not color alone)

**RoundControls.jsx**
```
Props: round, isActiveRound, incompleteCount, isLastRound, isFirstRound,
       onCompleteRound, onDeleteRound, onFinishTournament, onEditPairings
```
- "Start Round N (M incomplete)" / "Start Round N" / "Finish Tournament"
- "Delete Round" (small, subdued). Triggers ConfirmDialog with DELETE typing.
- "Edit Pairings" (when round unlocked + no normal results)
- Only visible when viewing active round

**PairingEditor.jsx**
```
Props: round, players, playerStats, completedRounds, onSave, onCancel
```
- Two-panel: unpaired players | current pairings
- Break → unpaired. Click-to-pair with sticky selection chip.
- Rematch warnings (inline amber). [Reset to Auto]. [Save] / [Cancel].

**StandingsTable.jsx**
```
Props: standings (sorted array from sortStandings), tournamentComplete, tournamentName, tournamentDate, onNewTournament
```
- Semantic `<table>`. Sticky header. Sticky rank+name on mobile.
- JetBrains Mono for tiebreaker columns.
- Sortable by name. Empty state.
- Tournament complete banner + [New Tournament] button.

**Modal.jsx**
```
Props: isOpen, onClose, title, children
```
- Focus trap, Escape to close, backdrop click to close
- `aria-modal`, `role="dialog"`

**ConfirmDialog.jsx**
```
Props: isOpen, message, confirmLabel, onConfirm, onCancel, requireTyping (string | null)
```
- If `requireTyping` set: text input that must match (e.g., "DELETE")
- Confirm button disabled until match

---

## 4. Test Plan

### Unit Tests (TDD — write before implementing)

**engine/stats.test.js**
- `deriveResult`: all cases from the table above (11 cases)
- `computePlayerStats`: single match win/loss/draw/bye/assigned_loss, multi-round, late entrant (6+ cases)
- `computeTiebreakers`: MWP floor, GWP with draws, OMWP/OGWP exclusions, zero-division cases (8+ cases)
- `sortStandings`: sort order verification, tie handling, rank assignment (5+ cases)

**engine/pairing.test.js**
- `generateRound1Pairings`: even, odd, 2 players (3 cases)
- `generateRoundNPairings`: no rematches, bye to lowest, bye constraint, backtracking (6+ cases)
- `buildFacedMap`: basic, with byes (2 cases)

**engine/roundCount.test.js**
- `recommendedRounds`: all breakpoints (8 cases)
- `defaultRounds`: capped at 3 (3 cases)

**state/reducer.test.js**
- Each action type: happy path + guard conditions (20+ cases)
- Full tournament flow integration test (1 comprehensive case)

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
- Score entry buttons work
- Bye card is read-only
- Left border color matches status

**StandingsTable.test.jsx**
- Renders all columns
- Sorts correctly
- Shows tournament complete banner
- Empty state

### Integration Test

**Full tournament flow** (RTL, single test):
1. Add 4 players
2. Start tournament (2 rounds)
3. Enter all R1 results
4. Complete R1
5. Verify R2 pairings (no rematches)
6. Enter all R2 results
7. Finish tournament
8. Verify final standings sort order

---

## 5. Build Sequence

Each step: write tests → implement → verify tests pass → commit.

### Step 1: Project Setup
**Files:** `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.jsx`, `src/styles/tokens.css`, `.github/workflows/deploy.yml`
- `npm create vite@latest . -- --template react`
- Add Tailwind, configure dark theme, color tokens as CSS custom properties
- Google Fonts in `index.html`
- `vite.config.js`: `base: '/swiss-tournament/'`
- GitHub Actions deploy workflow
- Verify: `npm run dev` shows blank app, `npm run build` succeeds

### Step 2: State Management
**Tests first:** `src/state/reducer.test.js`
**Files:** `src/state/actions.js`, `src/state/reducer.js`, `src/state/persistence.js`, `src/App.jsx`
- Action constants
- Reducer with all actions (START_TOURNAMENT uses stub pairing for now)
- localStorage save/load helpers
- App.jsx wires up useReducer + persistence
- Verify: all reducer tests pass

### Step 3: Registration UI
**Files:** `src/components/registration/*.jsx`, `src/components/Header.jsx`, `src/components/Footer.jsx`
- Header with app name + footer with GitHub link
- PlayerInput, PlayerList, BulkAdd, Registration
- Start Tournament button → RoundCountSelector modal
- Empty states
- Verify: can add/remove players, start tournament in browser

### Step 4: Match Cards + Round Nav
**Tests first:** `src/engine/pairing.test.js` (Round 1 only), `src/engine/roundCount.test.js`
**Files:** `src/engine/pairing.js`, `src/engine/roundCount.js`, `src/components/tournament/RoundNav.jsx`, `src/components/tournament/MatchCard.jsx`, `src/components/tournament/TabBar.jsx`
- Round 1 pairing algorithm
- Round count functions
- Connect START_TOURNAMENT to real pairing
- TabBar, RoundNav, compact MatchCard
- Verify: start tournament shows match cards with round nav

### Step 5: Stats Engine
**Tests first:** `src/engine/stats.test.js` (all unit tests)
**Files:** `src/engine/stats.js`
- `deriveResult`, `computePlayerStats`, `computeTiebreakers`, `sortStandings`
- Wire into App.jsx via useMemo
- Verify: all stats tests pass

### Step 6: Score Entry
**Files:** `src/components/tournament/ScoreEntry.jsx`, update MatchCard
- Expanded card with preset buttons + [+Draw] + [Reset]
- Match card shows player records from stats engine
- SET_MATCH_RESULT wired up
- Left-border status colors
- Verify: can enter scores, records update live

### Step 7: Standings Table
**Files:** `src/components/standings/StandingsTable.jsx`
- Semantic table, sticky header, mobile sticky columns
- Tiebreakers from stats engine
- Sortable by name
- Empty state
- Verify: standings update as scores are entered

### Step 8: Rounds 2+ Pairing
**Tests first:** `src/engine/pairing.test.js` (rounds 2+ tests)
**Files:** update `src/engine/pairing.js`
- `generateRoundNPairings` with phantom BYE + backtracking
- `buildFacedMap`
- Rematch fallback
- Wire COMPLETE_ROUND to use real pairing
- Verify: round 2 generates valid pairings, no rematches

### Step 9: Round Completion + Finish
**Files:** `src/components/tournament/RoundControls.jsx`, `src/components/ui/ConfirmDialog.jsx`, `src/components/ui/Modal.jsx`
- "Start Round N" with incomplete count
- "Complete Round?" confirmation
- "Finish Tournament" flow
- Tournament complete banner on standings
- Verify: full tournament lifecycle works

### Step 10: Delete Round
**Files:** update RoundControls, ConfirmDialog
- DELETE_ROUND action (stack pop)
- Type DELETE confirmation dialog
- Round 1 deletion returns to registration
- Verify: delete round, previous round unlocked

### Step 11: Late Player Additions
**Files:** `src/components/PlayerPanel.jsx`, update reducer
- Player panel (modal from header)
- ADD_LATE_PLAYER action with assigned losses
- Current-round modal (pair with bye / award bye / assign loss)
- Integration with open pairing editor
- Verify: add late player mid-tournament, correct assigned losses

### Step 12: Manual Pairing Override
**Files:** `src/components/tournament/PairingEditor.jsx`
- Break + rebuild two-panel layout
- Sticky selection chip
- Rematch warnings
- Reset to Auto
- Save/Cancel
- Verify: break pairing, create new, save

### Step 13: Accessibility Pass
- Verify contrast ratios (dev tools / axe)
- Keyboard navigate every interactive element
- Screen reader test (VoiceOver)
- ARIA attributes on all components
- Focus indicators
- Modal focus trapping
- `prefers-reduced-motion`

### Step 14: Polish
- CSS transitions (match card, buttons, tabs)
- Print stylesheet (`@media print`)
- Responsive verification (320px, 375px, 768px, 1024px)
- Session recovery banner
- Edge case testing (2 players, 3 players, 256 players)
- Cross-browser check

---

## 6. Deployment Config

### vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/swiss-tournament/',
  plugins: [react()],
})
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
