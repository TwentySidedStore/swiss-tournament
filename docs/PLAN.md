# Twenty Sided Swiss Pairings — Plan

## Overview
A single-file browser app (`index.html`) for running a Swiss tournament for Magic: The Gathering. Up to 256 players, up to 8 rounds (configurable), full MTR-compliant scoring and tiebreakers. Plain HTML + CSS + vanilla JS, no frameworks, no build step.

---

## Design Direction
Dark theme. Charcoals/blacks (#1a1a2e, #16213e range) with gold/amber accents (#d4a841, #c9952b). Google Fonts for display headings — pick something with character, not Inter or Roboto. Card-like UI elements with subtle borders and shadows. MTG-adjacent, not fantasy cosplay.

---

## Architecture

All state lives in a single JS object. UI redraws from state via a central `render()` function. State changes → call render → DOM updates. No two-way binding.

### State Shape
```
state = {
  players: [],          // Player objects
  rounds: [],           // Round objects
  currentRound: 0,      // index into rounds[]
  currentTab: "rounds", // "rounds" | "standings"
  tournamentStarted: false,
  tournamentComplete: false,
  maxRounds: 0,         // set by TO at start (default: min(3, ceil(log2(n))))
  editingPairings: false // swap mode toggle
}
```

---

## Data Model

### Player
```
{
  id: string,
  name: string,
  matchRecord: { w: 0, l: 0, d: 0 },
  gameRecord: { w: 0, l: 0, d: 0 },
  opponents: [],        // IDs of players faced (excludes byes)
  hasBye: false
}
```
- `matchPoints` = derived: w×3 + d×1
- `gamePoints` = derived: w×3 + d×1 (from gameRecord)

### Match
```
{
  player1Id: string,
  player2Id: string | null,  // null if bye
  isBye: boolean,
  games: { p1Wins: 0, p2Wins: 0, draws: 0 },
  result: null               // "p1_win" | "p2_win" | "draw" | null (derived from games)
}
```
- Match result auto-derived: more game wins = match win. Equal game wins = draw.
- Byes auto-set to games `{ p1Wins: 2, p2Wins: 0, draws: 0 }` — 3 match points, 6 game points.
- At least 1 game must be recorded per match. Do NOT hard-enforce best-of-3 — allow any count.

### Round
```
{
  roundNumber: number,  // 1-indexed
  matches: [],
  locked: false
}
```

---

## Scoring — MTR Compliant

### Match Level
- 3 points for a match win, 1 for a draw, 0 for a loss
- Bye = match win (3 match points)

### Game Level
- 3 game points per game win, 1 per game draw, 0 per game loss
- Bye = 2-0 (6 game points for bye player)

---

## Tiebreakers (MTR Appendix C)

Standings sorted in this exact order:
1. **Match Points** (descending)
2. **OMW%** — Opponents' Match-Win Percentage (descending)
3. **GW%** — Game-Win Percentage (descending)
4. **OGW%** — Opponents' Game-Win Percentage (descending)

### Formulas
- **Match-Win %** = player's match points / (3 × rounds completed). Floor at 0.33.
- **Game-Win %** = player's game points / (3 × total games played). Floor at 0.33.
- **OMW%** = average of each opponent's Match-Win %. Each opponent floored at 0.33. **Byes excluded** — do not include bye in opponent list.
- **OGW%** = average of each opponent's Game-Win %. Each opponent floored at 0.33. **Byes excluded.**

A player's bye counts toward THEIR stats (3 match points, 6 game points, 2 games played) but is NOT included when calculating their OMW% or OGW%.

---

## Round Count

**Recommended rounds** = `ceil(log2(playerCount))`:
- 2 players → 1 round
- 3–4 players → 2 rounds
- 5–8 players → 3 rounds
- 9–16 players → 4 rounds
- 17–32 players → 5 rounds
- 33–64 players → 6 rounds
- 65–128 players → 7 rounds
- 129–256 players → 8 rounds

**Default rounds** = `min(3, recommended)` — covers the common LGS case. TO can adjust up to the recommended value before starting.

At tournament start, a round-count selector appears (dropdown or stepper), pre-filled with the default. The TO confirms or adjusts, then pairings generate.

---

## Pairing Algorithm

### Round 1
1. Shuffle all players randomly
2. If odd number → last shuffled player gets a bye
3. Pair sequentially: [0,1], [2,3], etc.

### Rounds 2+
1. **Bye (if odd):** Among players without a bye, pick the one with the fewest match points. Ties broken randomly. Award bye (auto 2-0).
2. **Sort remaining** by match points descending. Shuffle within each point group.
3. **Greedy pair with backtracking:** From top, pair each player with the next available player they haven't faced. If no valid opponent in same point group, pair down. If stuck, backtrack and retry previous match with alternate pairing.
4. **Constraints:** No rematches. Max 1 bye per player per tournament.

### Manual Pairing Override
- "Edit Pairings" button available before any results are entered for the round
- Click-to-swap: click one player (highlights), click another (they swap)
- Visual warning if swap creates a rematch (but don't hard-block — TO is the authority)
- "Reset to Auto" regenerates default auto-pairings
- Entering any result disables edit mode for that round

---

## App Flow

### Phase 1: Player Registration
- Text input + Add button (Enter key also adds)
- Player list with remove buttons
- Min 2, max 256 players
- "Start Tournament" locks roster, shows round-count selector (default: min(3, recommended)), TO confirms
- Confirming round count generates Round 1 pairings

### Phase 2: Tournament — Two Tabs

#### Tab 1: Rounds
- Round navigation arrows (prev/next between existing rounds)
- Match cards: Player A vs Player B (or "BYE")
- Game score entry per match: P1 game wins, P2 game wins, Draws (number inputs)
- Bye matches pre-filled and read-only
- "Lock Round" button — disabled until all matches have results
  - Locks round (read-only with lock indicator)
  - Generates next round pairings
  - Final round: "Finish Tournament" — locks and triggers complete state
- Locked rounds display results as read-only

#### Tab 2: Standings
- Table: Rank, Player, Points, Record (W-L-D), OMW%, GW%, OGW%
- Sorted by tiebreaker hierarchy
- Updates live as results are entered
- Shows standings as of the currently viewed round
- Tournament Complete: banner at top, final standings

---

## Edge Cases
- **2 players:** 1 round, 1 match, done.
- **3 players:** 2 rounds. R1 = random pair + 1 bye. R2 = bye player paired with R1 winner, R1 loser gets bye.
- **All lowest-point players already had byes:** Give bye to next-lowest without one.
- **Game draws:** Supported. 1 game point each. Match result still derived from game W-L comparison.

---

## Build Order
1. Registration UI (add/remove players, start tournament)
2. Round generation + display (match cards, round nav)
3. Game score entry + match result derivation
4. Standings table with live updates
5. Tiebreaker calculations (OMW%, GW%, OGW%)
6. Pairing algorithm for rounds 2+
7. Manual pairing override (click-to-swap)
8. Round locking + tournament completion
9. Polish: design, animations, responsive
