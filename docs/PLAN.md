# Twenty Sided Swiss Pairings — Plan

## Overview
A browser-based React app for running a Swiss tournament for Magic: The Gathering. Up to 256 players, up to 8 rounds (configurable), full MTR-compliant scoring and tiebreakers. Built with React + Vite, Tailwind CSS.

---

## Design Direction
Dark theme. Charcoals/blacks (#1a1a2e, #16213e range) with gold/amber accents (#d4a841, #c9952b). Google Fonts for display headings — pick something with character, not Inter or Roboto. Card-like UI elements with subtle borders and shadows. MTG-adjacent, not fantasy cosplay.

---

## Architecture

React + Vite project. Functional components with hooks. State managed via `useReducer`. All player stats (match points, game points, records, tiebreakers) are **derived from match data on render** — never stored on player objects. Player objects only hold identity (`id`, `name`). The `rounds[].matches[]` array is the single source of truth for all results.

Persistence via `localStorage` — `JSON.stringify(state)` after every state change, `JSON.parse` on load. The full state at 256 players / 8 rounds serializes to ~200KB, well within localStorage limits.

### State Shape
```
{
  players: [],              // Player objects (identity only)
  rounds: [],               // Round objects (source of truth for results)
  activeRound: 0,           // index of the latest round (advances on lock)
  viewingRound: 0,          // index of the round the UI is showing (nav arrows)
  currentTab: "rounds",     // "rounds" | "standings"
  tournamentStarted: false,
  tournamentComplete: false,
  maxRounds: 0              // set by TO at start (default: min(3, ceil(log2(n))))
}
```

`activeRound` = the round being played. Advances when a round is locked.
`viewingRound` = which round's match cards the TO is looking at. Changes with nav arrows. Standings tab always shows current live standings (all entered results across all rounds).

---

## Data Model

### Player
```
{
  id: number,       // autoincrement
  name: string
}
```
All stats are derived from match data:
- `matchRecord` (W-L-D) — computed by walking all matches
- `gameRecord` (W-L-D) — computed by walking all matches
- `matchPoints` = matchW × 3 + matchD × 1
- `gamePoints` = gameW × 3 + gameD × 1
- `opponents` — list of real opponent IDs (excludes byes and assigned losses)
- `hasBye` — whether the player has a bye in any round
- `roundsCompleted` — number of rounds this player has a result in (per-player, includes byes and assigned losses)

### Match
```
{
  player1Id: number,
  player2Id: number | null,     // null for bye/assigned_loss
  type: "normal" | "bye" | "assigned_loss",
  games: { p1Wins: 0, p2Wins: 0, draws: 0 },
  result: null                  // derived (see below)
}
```

**Match types:**
- `"normal"` — real match between two players
- `"bye"` — synthetic win, no opponent. Games auto-set to `{ p1Wins: 2, p2Wins: 0, draws: 0 }`. Awards 3 match points, 6 game points. Excluded from OMW/OGW opponent lists.
- `"assigned_loss"` — synthetic loss, no opponent (for late entrants' missed rounds). Games set to `{ p1Wins: 0, p2Wins: 2, draws: 0 }`. Awards 0 match points, 0 game points, counts as 2 games played. Excluded from OMW/OGW opponent lists.

**Result derivation:**
- All game counters at 0 → `null` (no result entered yet)
- `p1Wins > p2Wins` → `"p1_win"`
- `p2Wins > p1Wins` → `"p2_win"`
- `p1Wins === p2Wins` AND at least one game recorded → `"draw"`

### Round
```
{
  roundNumber: number,    // 1-indexed
  matches: [],
  locked: false,
  editingPairings: false  // swap mode toggle, scoped to this round
}
```

---

## Scoring — MTR Compliant

### Match Level
- 3 points for a match win, 1 for a draw, 0 for a loss
- Bye = match win (3 match points)
- Assigned loss = match loss (0 match points)

### Game Level
- 3 game points per game win, 1 per game draw, 0 per game loss
- Bye = 2-0 (6 game points for bye player)
- Assigned loss = 0-2 (0 game points, 2 games played)

---

## Tiebreakers (MTR Appendix C)

Standings sorted in this exact order:
1. **Match Points** (descending)
2. **OMW%** — Opponents' Match-Win Percentage (descending)
3. **GW%** — Game-Win Percentage (descending)
4. **OGW%** — Opponents' Game-Win Percentage (descending)
5. **Player ID** (ascending) — final tiebreaker for display stability

### Formulas
- **Match-Win %** = player's match points / (3 × rounds completed by this player). Floor at 0.33. If 0 rounds completed, return 0.
- **Game-Win %** = player's game points / (3 × total games played by this player). Floor at 0.33. If 0 games played, return 0.
- **OMW%** = average of each real opponent's Match-Win %. Each individual opponent's MWP is floored at 0.33 before averaging. **Byes and assigned losses excluded** from opponent list. If no real opponents, return 0.
- **OGW%** = average of each real opponent's Game-Win %. Each individual opponent's GWP is floored at 0.33 before averaging. **Byes and assigned losses excluded.** If no real opponents, return 0.

**"Rounds completed"** is per-player: the number of rounds where this player has any result (including byes and assigned losses). A late entrant joining in Round 3 with two assigned losses has 3 rounds completed.

A player's bye/assigned_loss counts toward THEIR stats (match points, game points, games played, rounds completed) but is NOT included when calculating their OMW% or OGW%.

Display format: `0.0000` (four decimal places). Show `0` when undefined (not dashes or N/A).

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

**Default rounds** = `min(3, recommended)` — covers the common LGS case. TO can adjust up to the recommended value before starting. Hard cap at recommended — no higher, to prevent impossible pairings (rematches become unavoidable beyond log2(n) rounds).

At tournament start, a round-count selector appears (dropdown or stepper), pre-filled with the default. The TO confirms or adjusts, then pairings generate.

---

## Pairing Algorithm

### Round 1
1. Shuffle all players randomly
2. If odd number: add a BYE phantom to the pool (see "Phantom BYE" below)
3. Pair sequentially: [0,1], [2,3], etc. The BYE phantom (if present) naturally lands at the bottom, pairing with the last real player.

### Rounds 2+

Uses the **Phantom BYE** approach — bye assignment is integrated into the pairing algorithm, not pre-assigned.

```
function pairRound(players, completedRounds):
  pool = [...players]

  // If odd, add a BYE phantom with -Infinity points
  // This sorts to the bottom and pairs like a real player
  if pool.length is odd:
    pool.push(BYE_PHANTOM)

  // Build "already faced" map from completed rounds
  // Players who had a bye have BYE_PHANTOM in their faced set
  faced = buildFacedMap(completedRounds)

  // Sort by match points descending
  // Within each point group, shuffle randomly
  // BYE_PHANTOM (-Infinity) always sorts to the very bottom
  sorted = sortByPointsShuffleWithinGroups(pool)

  // Greedy pairing with backtracking
  // Same constraints for all: no player can face anyone in their faced set
  // This handles both rematches AND double-byes uniformly
  function backtrack(remaining, pairs):
    if remaining is empty: return pairs  // all paired, success

    player = remaining[0]
    candidates = remaining[1:]

    for each candidate in candidates (in order):
      if candidate not in faced[player]:
        result = backtrack(
          candidates without candidate,
          pairs + [player, candidate]
        )
        if result: return result

    return null  // dead end, trigger backtrack

  pairings = backtrack(sorted, [])

  // Convert: any pair containing BYE_PHANTOM becomes a bye match
  // The real player in that pair receives the bye
  return pairings
```

**Why this works:**
- BYE phantom has -Infinity points → always sorts last → naturally pairs with the lowest-ranked real player
- "Already had a bye" = "already faced BYE_PHANTOM" → handled by the same no-rematch constraint
- If the lowest player already had a bye, the backtracker tries the next-lowest, then the next, automatically
- Produces globally optimal pairings — no separate bye logic that might conflict with pairing quality
- At 256 players (128 pairs), recursion depth is manageable. The no-rematch constraint rarely forces deep backtracking since each player has faced at most 7 of 255 possible opponents.

### Manual Pairing Override
- "Edit Pairings" button available before any results are entered for the round
- `editingPairings` flag lives on the Round object, scoped to that round
- Click-to-swap: click one player (highlights), click another (they swap positions)
- If a swap involves a bye recipient, the bye transfers to the swapped-in player
- Visual warning if swap creates a rematch (but don't hard-block — TO is the authority)
- "Reset to Auto" regenerates default auto-pairings
- Entering any result disables edit mode for that round

---

## Score Entry UI

### Match Card — Compact View (default)
```
  Alice        2 - 0        Bob
```
Shows player names and game score. Click/tap to expand.

### Match Card — Expanded View
```
  Alice        2 - 0        Bob

  [2-0]  [2-1]  [1-0]  [Draw]  [0-1]  [1-2]  [0-2]     [✎]
```

**Quick-select buttons** — one tap sets the full game result:
- **[2-0]** → games: { p1Wins: 2, p2Wins: 0, draws: 0 }
- **[2-1]** → games: { p1Wins: 2, p2Wins: 1, draws: 0 }
- **[1-0]** → games: { p1Wins: 1, p2Wins: 0, draws: 0 }
- **[Draw]** → games: { p1Wins: 1, p2Wins: 1, draws: 1 } (standard MTG match draw)
- **[0-1]** → games: { p1Wins: 0, p2Wins: 1, draws: 0 }
- **[1-2]** → games: { p1Wins: 1, p2Wins: 2, draws: 0 }
- **[0-2]** → games: { p1Wins: 0, p2Wins: 2, draws: 0 }

Buttons are symmetrical: P1 wins on the left, draw in the center, P2 wins on the right. Covers best-of-3 (2-0, 2-1), best-of-1 / time-called (1-0), and draws — all in one tap.

**Custom entry [✎]** — opens tap-to-increment mode for unusual results:
- Time-called draws with mixed results (1-0-1, 0-0-1)
- Any other edge case the quick buttons don't cover
- Three buttons: [P1 Win] [Draw] [P2 Win], each increments the counter
- [Reset] zeros all counters

Bye and assigned_loss matches display as read-only (no input needed).

At 128+ matches per round, only one match is expanded at a time to keep the page manageable.

---

## App Flow

### Phase 1: Player Registration
- Text input + Add button (Enter key also adds)
- Player list with remove buttons
- Duplicate names allowed (players distinguished by autoincrement ID internally)
- Min 2, max 256 players
- "Start Tournament" shows round-count selector (default: min(3, recommended)), TO confirms
- Confirming round count locks initial roster and generates Round 1 pairings

### Late Player Additions
Players can be added after the tournament starts.

**For all locked (completed) rounds:** Auto-insert an assigned loss match (0-2, no opponent).

**For the current active round:** Show a modal with options:
- If someone currently has a bye: **[Pair with {Bye Player}]** | **[Award Bye]** | **[Assign Loss]**
- If no bye exists (even player count): **[Award Bye]** | **[Assign Loss]**

"Pair with Bye Player" removes the existing bye and creates a real match between the two players. This is the most common scenario (odd→even).

### Phase 2: Tournament — Two Tabs

#### Tab 1: Rounds
- Round navigation arrows (prev/next between generated rounds)
- `viewingRound` controls which round's matches are displayed
- Match cards in compact view; click to expand for score entry
- Bye/assigned_loss matches displayed as read-only
- "Lock Round" button — visible only when `viewingRound === activeRound`, disabled until all matches have results
  - Locks round (freezes pairings)
  - Generates next round pairings
  - Final round: "Finish Tournament" — locks and triggers tournament complete state
- **Results are always editable** on any round, locked or not. "Locked" means pairings are frozen, not scores. All derived stats recalculate automatically when scores change.

#### Tab 2: Standings
- Table: Rank, Player, Points, Record (W-L-D), OMW%, GW%, OGW%
- Sorted by full tiebreaker hierarchy (including player ID as final tiebreaker)
- **Always shows current live standings** — all entered results across all rounds
- Updates live as results are entered
- Tournament Complete: banner at top, final standings

---

## Edge Cases
- **2 players:** 1 round, 1 match, done.
- **3 players:** 2 rounds. Pairing algorithm handles bye rotation naturally.
- **Bye constraint exhaustion:** If all lowest-point players already had byes, the phantom BYE approach automatically pushes the bye up to a higher-pointed eligible player via backtracking.
- **Game draws:** Supported. 1 game point each per drawn game. Match result derived from game W-L comparison.
- **No result vs. draw:** All game counters at 0 = no result (null). Equal non-zero game wins = match draw.
- **Late entrants:** Assigned losses for missed rounds. Per-player rounds-completed includes these for correct tiebreaker math.
- **Duplicate player names:** Allowed. Internal autoincrement ID distinguishes players. UI shows names as entered.

---

## Accessibility (WCAG 2.1 AA)

Accessibility is a first-class requirement, not a polish pass. Bake it in from the start.

### Color & Contrast
- All text must meet **WCAG AA contrast ratios**: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
- Verify gold (#d4a841) on dark backgrounds meets ratio — adjust accent shades if needed
- Never rely on color alone to convey information (e.g., match results, warnings). Pair with text labels, icons, or patterns
- Active/selected states (e.g., quick-select buttons, swap highlights) must be distinguishable without color — use borders, weight, or icons

### Keyboard Navigation
- All interactive elements reachable and operable via keyboard (Tab, Enter, Space, Escape, Arrow keys)
- Visible focus indicators on all focusable elements — high-contrast outline, not just browser default
- Quick-select score buttons navigable with arrow keys within the button group
- Modal dialogs (late addition, round-count selector) trap focus and close on Escape
- Click-to-swap pairing override must work with keyboard: Enter to select, Enter to swap, Escape to cancel

### Semantic HTML & ARIA
- Use semantic elements: `<nav>`, `<main>`, `<table>`, `<button>`, `<dialog>`, `<h1>`–`<h3>`
- Standings table uses proper `<table>` with `<thead>`, `<th scope>`, not divs
- Match cards use appropriate roles; expanded/collapsed state communicated via `aria-expanded`
- Tab switching uses `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected`
- Round navigation arrows labeled (`aria-label="Previous round"`, `"Next round"`)
- Live regions (`aria-live="polite"`) for: standings updates, round lock confirmations, pairing generation status
- Score buttons in a group use `role="group"` with `aria-label="Match result for Alice vs Bob"`

### Screen Reader Support
- Match cards announce: player names, current score, match status (no result / P1 win / P2 win / draw)
- Standings table rows are fully readable: rank, name, points, record, tiebreakers
- Bye and assigned loss matches announce their type ("Bye — Alice receives a bye", "Assigned loss")
- Tournament phase changes announced via live region ("Round 2 pairings generated", "Tournament complete")

### Motion & Responsiveness
- Respect `prefers-reduced-motion` — disable or minimize animations/transitions
- Touch targets minimum 44x44px for all buttons (especially score entry on mobile)
- Responsive layout works at 320px viewport width minimum
- No horizontal scrolling required at any supported viewport size

---

## Tech Stack
- **React + Vite** — `npm run build` produces static `dist/` folder
- **Tailwind CSS** — utility-first styling
- **localStorage** — persistence (JSON serialize/deserialize)
- **No other dependencies**
- **Deployment:** Static files → GitHub Pages or nginx on Hetzner

---

## Build Order
1. Vite project setup + Tailwind config + dark theme foundation
2. Registration UI (add/remove players, start tournament, round-count selector)
3. Core state management (useReducer, localStorage persistence)
4. Round 1 pairing + match card display (compact/expanded)
5. Score entry UI (quick-select buttons + custom mode)
6. Match result derivation + stats computation from match data
7. Standings table with live tiebreaker calculations
8. Rounds 2+ pairing algorithm (phantom BYE + backtracking)
9. Round locking + next round generation + tournament completion
10. Late player additions
11. Manual pairing override (click-to-swap)
12. Polish: responsive design, animations, edge case handling
