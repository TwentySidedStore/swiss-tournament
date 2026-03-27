# Twenty Sided Swiss Pairings — Plan

## Overview
A browser-based React app for running a Swiss tournament for Magic: The Gathering. Up to 256 players. Round count chosen by the TO at tournament start (defaults to 3). Full MTR-compliant scoring and tiebreakers. Built with React + Vite, Tailwind CSS. Mobile-first design.

---

## Design Direction

### Visual Identity
Dark theme. MTG-adjacent. Premium tool aesthetic — clean, authoritative, modern.

### Color Token System

**Backgrounds (4 elevation levels)**
```
--bg-base:      #0f0f1a    /* page background */
--bg-surface:   #1a1a2e    /* card backgrounds, match cards */
--bg-elevated:  #1f2040    /* expanded states, modal interiors */
--bg-overlay:   #252548    /* hover states, active table rows */
```

**Gold Scale (5 tones)**
```
--gold-dim:     #7a5c1a    /* subtle borders on dark surfaces */
--gold-muted:   #a37828    /* secondary labels, dividers */
--gold-mid:     #c9952b    /* secondary interactive elements */
--gold-primary: #d4a841    /* primary actions, active states, headings */
--gold-bright:  #e8c060    /* hover states on primary gold elements */
```

**Semantic Colors (all must pass 4.5:1 on --bg-surface)**
```
--color-win:       #4ade80    /* green — match win indicator */
--color-win-dim:   #166534    /* background tint for win state */
--color-loss:      #f87171    /* red — loss indicator */
--color-loss-dim:  #7f1d1d
--color-draw:      #94a3b8    /* neutral gray — draw state */
--color-draw-dim:  #334155
--color-warning:   #fbbf24    /* amber — rematch warning, incomplete */
--color-warning-dim: #78350f
--color-bye:       #818cf8    /* indigo — bye/assigned_loss indicator */
--color-bye-dim:   #3730a3
```

**Text Scale**
```
--text-primary:   #e8e8f0    /* headings, player names */
--text-secondary: #a0a0bc    /* labels, column headers */
--text-muted:     #606080    /* hint text */
--text-disabled:  #3d3d5c    /* disabled controls */
```

All semantic colors include text label/icon pairing — never rely on color alone (WCAG).

### Typography

**Font Stack:**
```css
--font-display: 'Cinzel', Georgia, serif;          /* headings, round labels, tournament name */
--font-body: 'DM Sans', system-ui, sans-serif;     /* body, buttons, table cells, UI text */
--font-mono: 'JetBrains Mono', monospace;           /* tiebreaker %, scores, tabular data */
```

Google Fonts load: `Cinzel:wght@400;600;700`, `DM+Sans:wght@400;500;600`, `JetBrains+Mono:wght@400;500`

- **Cinzel**: Roman inscription serif — authoritative, competitive, works for short headings (ROUND 4, STANDINGS)
- **DM Sans**: Geometric sans-serif — legible at 13-14px, good numeral differentiation (1/l/I distinct)
- **JetBrains Mono**: True tabular metrics — guaranteed column alignment for 0.6667 etc. across 256 rows

### Responsive Strategy — Mobile-First

Design every component at 375px first, enhance with Tailwind `md:` (768px) and `lg:` (1024px).

| Component | Mobile (375px) | Tablet (768px) | Desktop (1024px+) |
|---|---|---|---|
| Score buttons | 2 rows | 1-2 rows | 1 row |
| Match cards | Full width, stacked | Full width | Max-width container |
| Standings table | Sticky rank+name, h-scroll tiebreakers | Full table | Full table, wide spacing |
| Pairing editor | Single column (unpaired above, pairings below) | Two columns | Two columns |
| Registration list | Single column | Two columns | Two columns |

---

## Architecture

React + Vite project. Functional components with hooks. State managed via `useReducer`. All player stats (match points, game points, records, tiebreakers) are **derived from match data on render** — never stored on player objects. Player objects only hold identity (`id`, `name`). The `rounds[].matches[]` array is the single source of truth for all results.

`result` is **not stored** on match objects — it is derived from game counters via a pure utility function `deriveResult(games)` wherever needed. This prevents result/games desync when scores are edited.

Stats computation order: compute all players' MWP/GWP first (pass 1), then compute OMW%/OGW% using those values (pass 2). Use `useMemo` keyed on the rounds array.

Persistence via `localStorage` — `JSON.stringify(state)` after every state change, `JSON.parse` on load. The full state at 256 players / 8 rounds serializes to ~200KB, well within localStorage limits. Single key: `swiss-tournament-state`. One tournament at a time.

**Rounds are a stack.** Push when generating a new round. Pop when deleting the current round (rollback). Only the top of the stack (active round) can be deleted.

### State Shape
```
{
  players: [],              // Player objects (identity only)
  rounds: [],               // Round objects — stack (source of truth for results)
  activeRound: null,        // index of the latest round (null before start, advances on complete)
  viewingRound: null,       // index of round the UI is showing (null before start, nav arrows)
  currentTab: "rounds",     // "rounds" | "standings"
  tournamentStarted: false,
  tournamentComplete: false,
  maxRounds: null,          // set by TO at start (default: min(3, ceil(log2(n))))
  tournamentName: "",       // set during registration
  tournamentDate: ""        // set during registration (auto-filled to today)
}
```

**Null guards:** `activeRound`, `viewingRound`, and `maxRounds` are `null` before tournament start. All round-indexed reads must guard on `rounds.length > 0` and null checks.

`activeRound` = the round being played. Advances when a round is completed.
`viewingRound` = which round's match cards the TO is looking at. Changes with nav arrows. Standings tab always shows current live standings (all entered results across all rounds).

**Ephemeral UI state** (not persisted to localStorage):
- `expandedMatchId` — which match card is expanded (component-local `useState`, resets on round change or tab switch)
- `editingPairings` — whether pairing editor is open (on the Round object but reset to `false` on load; unsaved edits are discarded on refresh)

### Session Recovery
On load, if localStorage contains a tournament in progress, restore it and show a brief banner: "Resumed: Round X of Y · N of M results entered." Auto-dismisses after 5 seconds or on tap.

### Multiple Tournaments
One tournament at a time. "New Tournament" option in header menu. If a tournament is in progress, confirmation: "Starting a new tournament will clear the current one. Continue?" If tournament is complete, no warning needed — clears and resets to registration. No archive/history in v1.

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
  games: { p1Wins: 0, p2Wins: 0, draws: 0 }
}
```

`result` is **derived, not stored**. Computed via `deriveResult(games)`:
- All game counters at 0 → `null` (no result entered yet)
- `p1Wins > p2Wins` → `"p1_win"`
- `p2Wins > p1Wins` → `"p2_win"`
- `p1Wins === p2Wins` AND at least one game recorded → `"draw"`

**Match types:**
- `"normal"` — real match between two players
- `"bye"` — synthetic win, no opponent. Games auto-set to `{ p1Wins: 2, p2Wins: 0, draws: 0 }`. Awards 3 match points, 6 game points. Excluded from OMW/OGW opponent lists. **Always has a result** (game counters initialized non-zero).
- `"assigned_loss"` — synthetic loss, no opponent (for late entrants' missed rounds). Games set to `{ p1Wins: 0, p2Wins: 2, draws: 0 }`. Awards 0 match points, 0 game points, counts as 2 games played. Excluded from OMW/OGW opponent lists. **Always has a result.**

### Round
```
{
  roundNumber: number,    // 1-indexed
  matches: [],
  locked: false
}
```

`editingPairings` is ephemeral UI state — not persisted. Only settable when `round.locked === false` and no normal match results have been entered. Both [Save Pairings] and [Cancel] reset it to `false`.

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

Display format: `0.0000` (four decimal places, JetBrains Mono). Show `0` when undefined (not dashes or N/A).

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

At tournament start, a round-count selector appears (stepper), pre-filled with the default. The TO confirms or adjusts, then pairings generate.

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

  // Fallback: if no valid pairing found (should never happen within
  // round cap, but for robustness), re-run without faced constraint
  // (allow rematches) and warn the TO
  if pairings is null:
    pairings = backtrack_without_constraints(sorted)
    showWarning("Some rematches were necessary")

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

### Manual Pairing Override (Break + Rebuild)

Available every round when `round.locked === false` AND no normal match results have been entered for the round (byes/assigned losses don't count).

**Two-panel layout** (single column stacked on mobile):

**Left panel — Unpaired Players:**
- Shows players broken out of pairings
- Empty initially ("No Unpaired Players")
- Click a player to select them → sticky chip pins to top: "Creating pairing: Alice (6 pts) + ?" with [✕ Cancel]
- Click a second unpaired player → new pairing created
- If one player remains → [Assign Bye] button appears

**Right panel — Current Pairings:**
- Table #, Player A (record), Pts, Player B (record), Pts
- Each pairing has [Break] → both players go to unpaired pool
- Inline amber warning on any pairing that creates a rematch (non-blocking)

**Actions:**
- [Reset to Auto] regenerates algorithm pairings
- [Save Pairings] / [Cancel] to commit or revert (both close editor)

---

## Score Entry UI

### Match Card — Compact View (default)
```
┌─ ── ──────────────────────────────────────────┐
│  Alice (2-0-0)     2 - 0 - 0     Bob (1-1-0)  │
└────────────────────────────────────────────────┘
```
Left border color indicates status:
- **Gray** (`--text-muted`): no result entered
- **Gold** (`--gold-primary`): result entered
- **Indigo** (`--color-bye`): bye or assigned loss (always "complete")

Shows player names with current records (W-L-D), and game score (wins-wins-draws). Records update live as results are entered across all matches. Click/tap to expand. Only one match expanded at a time (component-local state, resets on round change).

### Match Card — Expanded View

**Row 1 — Quick-select presets** (set p1Wins and p2Wins, reset draws to 0):
```
[2-0]  [2-1]  [1-0]  [1-1]  [0-1]  [1-2]  [0-2]
```

**Row 2 — Modifiers:**
```
[+Draw]  [Reset]
```

- **[2-0]** → { p1Wins: 2, p2Wins: 0, draws: 0 }
- **[2-1]** → { p1Wins: 2, p2Wins: 1, draws: 0 }
- **[1-0]** → { p1Wins: 1, p2Wins: 0, draws: 0 }
- **[1-1]** → { p1Wins: 1, p2Wins: 1, draws: 0 } (match draw)
- **[0-1]** → { p1Wins: 0, p2Wins: 1, draws: 0 }
- **[1-2]** → { p1Wins: 1, p2Wins: 2, draws: 0 }
- **[0-2]** → { p1Wins: 0, p2Wins: 2, draws: 0 }
- **[+Draw]** → increments draws counter by 1 (does NOT change p1Wins/p2Wins). Composes with presets: click [1-0] then [+Draw] ×5 = 1-0-5.
- **[Reset]** → zeros all counters (result becomes null)

Common flows:
- **2-0**: click [2-0]. One tap.
- **2-1**: click [2-1]. One tap.
- **1-0** (time/BO1): click [1-0]. One tap.
- **1-1** (match draw): click [1-1]. One tap.
- **1-1-1** (draw + drawn game): [1-1] then [+Draw]. Two taps.
- **0-0-3** (intentional draw, 3 drawn games): [+Draw] ×3. Three taps.
- **1-0-5** (extreme edge): [1-0] then [+Draw] ×5. Six taps.

Bye and assigned_loss matches display as read-only (no input needed).

Active/selected preset button highlighted with `--gold-primary` background + bold weight (not color alone).

---

## App Shell / Navigation

### Header
Always visible. Contains:
- App name / logo ("Twenty Sided Swiss") in Cinzel
- Tournament name (when active)
- **Players (N)** link → opens player panel (see below)
- [Print] button (calls `window.print()`)
- [New Tournament] menu option

### Player Panel
Accessible via "Players (N)" in the header. Shows during tournament:
- Full player list (names + current records, read-only)
- [+ Add Player] input at the top for late additions
- Subtle, not prominent — late additions are rare

During registration phase, the main content area IS the player list with full add/remove capabilities. The player panel is only needed during the tournament.

### Tab Bar
Appears after tournament starts. Two tabs: **Rounds** | **Standings**.
Uses `role="tablist"` / `role="tab"` / `role="tabpanel"`.
Rounds tab shows badge with active round number: **Rounds [4]**.
Auto-switches to Rounds tab when a new round is generated.

### Round Navigation
Within the Rounds tab: `← Round 3 of 5 →`
Arrows disabled and visually muted at boundaries (Round 1 = no prev, latest round = no next).
Current active round distinguished from historical rounds (e.g., "ACTIVE" badge or dot indicator).

### Footer
Always visible. Minimal, in `--text-muted`, small font, centered:
```
Twenty Sided Store · View source on GitHub
```
"View source on GitHub" links to `https://github.com/TwentySidedStore/swiss-tournament`.

---

## App Flow

### Phase 1: Player Registration
- Tournament name input (optional, used in header + print)
- Tournament date input (auto-filled to today)
- Player name input + Add button (Enter key also adds)
- **Bulk Add** link → reveals textarea for newline-delimited names. Parse, trim, skip blanks. Button: "Add N Players" / [Cancel]
- Player list with remove buttons (no confirmation needed — easy to re-add)
- Duplicate names allowed (players distinguished by autoincrement ID internally)
- Min 2, max 256 players
- "Start Tournament" → round-count selector (stepper, default min(3, recommended), max at recommended). Confirm generates Round 1 pairings.

**Empty states:**
- 0 players: "Add players to begin" below the empty list area. Start Tournament disabled.
- 1 player: Player shown in list. Start Tournament disabled. Note: "Add at least 2 players to start."

### Late Player Additions
Players can be added after the tournament starts via the player panel ([+ Add Player]).

**Works the same on every round** — no special case for Round 1.

**For all locked (completed) rounds:** Auto-insert an assigned loss match (0-2, no opponent).

**For the current active round:** Show a modal with options:
- If someone currently has a bye: **[Pair with {Bye Player}]** | **[Award Bye]** | **[Assign Loss]**
- If no bye exists (even player count): **[Award Bye]** | **[Assign Loss]**
- If the pairing editor is currently open: skip the modal — new player appears directly in the unpaired pool. TO pairs them manually from within the editor.

"Pair with Bye Player" removes the existing bye and creates a real match between the two players. This is the most common scenario (odd→even).

### Phase 2: Tournament — Two Tabs

#### Tab 1: Rounds
- Round navigation arrows (prev/next between generated rounds)
- `viewingRound` controls which round's matches are displayed
- Match cards in compact view showing player records; click to expand for score entry
- Bye/assigned_loss matches displayed as read-only with indigo left border and type badge
- **"Start Round N"** button — visible only when `viewingRound === activeRound`
  - When disabled (not all results entered): shows **"Start Round N (M incomplete)"** count
  - Confirmation: **"Complete Round?"**
  - On confirm: freezes pairings, generates next round (push to stack), advances activeRound
  - Final round: **"Finish Tournament"** (or "Finish Event") with confirmation: **"Complete Round?"**
- **"Delete Round"** button — visible only when `viewingRound === activeRound`, small/subdued
  - Confirmation: **"Delete Round and entered results?"** — requires typing DELETE to confirm
  - Pops current round from stack. Previous round becomes active again (`locked: false`). Previous round's results are preserved.
  - On Round 1: returns to registration phase (`tournamentStarted: false`). Players preserved.
- **Results are always editable** on any round, locked or not. "Locked" means pairings are frozen, not scores. All derived stats recalculate automatically when scores change.

#### Tab 2: Standings
- Table: Rank, Player, Points, Record (W-L-D), OMW%, GW%, OGW%
- Semantic `<table>` with `<thead>`, `<th scope>`. Sticky header.
- On mobile: sticky Rank + Player columns, horizontal scroll for tiebreaker columns
- Tiebreaker values in JetBrains Mono for column alignment
- Sorted by full tiebreaker hierarchy (including player ID as final tiebreaker)
- Sortable by player name (for TO lookup). `aria-sort` on sortable columns.
- Row hover highlight on desktop
- **Always shows current live standings** — all entered results across all rounds
- Updates live as results are entered
- Empty state: "Standings update as results are entered."
- Tournament Complete: banner with tournament name/date, final standings prominent, [New Tournament] button

### Print Stylesheet (`@media print`)
- Strips navigation, tabs, buttons, interactive elements
- Forces white background, black text
- Prints the current view: standings table OR round pairings
- Includes tournament name and date at top
- `page-break-inside: avoid` on table sections
- Full table columns visible (no sticky/scroll behavior in print)

---

## Round Lifecycle

Rounds are a **stack**. The lifecycle of a round:

1. **Generated** — pairings created (via algorithm or manual override). `locked: false`.
2. **In progress** — TO enters results. Match cards editable. "Start Round N" button visible.
3. **Completed** — TO confirms "Complete Round?" → `locked: true`. Next round pushed to stack (or tournament finishes).
4. **Rolled back** (optional) — TO deletes the current active round → current round popped, previous round unlocked (`locked: false`), previous round's results preserved.

At any point, scores on any round (current or past) can be edited. "Locked" only means pairings are frozen — scores are always editable.

---

## Edge Cases
- **Bye constraint exhaustion:** If all lowest-point players already had byes, the phantom BYE approach automatically pushes the bye up to a higher-pointed eligible player via backtracking.
- **Pairing failure:** If backtracking exhausts all options (theoretically impossible within round cap), fall back to rematches with TO warning.
- **Delete Round 1:** Returns to registration phase (`tournamentStarted: false`). Players preserved, rounds emptied.

---

## Accessibility (WCAG 2.1 AA)

Accessibility is a first-class requirement, not a polish pass. Bake it in from the start.

### Color & Contrast
- All text must meet **WCAG AA contrast ratios**: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
- Verify gold (#d4a841) on dark backgrounds meets ratio — adjust accent shades if needed
- Never rely on color alone to convey information (e.g., match results, warnings). Pair with text labels, icons, or patterns
- Active/selected states (e.g., quick-select buttons, pairing editor highlights) must be distinguishable without color — use borders, weight, or icons

### Keyboard Navigation
- All interactive elements reachable and operable via keyboard (Tab, Enter, Space, Escape, Arrow keys)
- Visible focus indicators on all focusable elements — high-contrast outline, not just browser default
- Quick-select score buttons navigable with arrow keys within the button group
- Modal dialogs (late addition, round-count selector, confirmations) trap focus and close on Escape
- Pairing editor: Enter to select/pair, Escape to cancel selection

### Semantic HTML & ARIA
- Use semantic elements: `<nav>`, `<main>`, `<table>`, `<button>`, `<dialog>`, `<h1>`–`<h3>`
- Standings table uses proper `<table>` with `<thead>`, `<th scope>`, not divs
- Match cards use appropriate roles; expanded/collapsed state communicated via `aria-expanded`
- Tab switching uses `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected`
- Round navigation arrows labeled (`aria-label="Previous round"`, `"Next round"`)
- Live regions (`aria-live="polite"`) for: standings updates, round completion, pairing generation status
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
- No horizontal scrolling required at any supported viewport size (except standings tiebreaker columns on mobile)

---

## Tech Stack
- **React + Vite** — `npm run build` produces static `dist/` folder
- **Tailwind CSS** — utility-first styling, mobile-first breakpoints
- **Google Fonts** — Cinzel, DM Sans, JetBrains Mono
- **localStorage** — persistence (JSON serialize/deserialize)
- **Vitest + React Testing Library** — TDD for engine and reducer, component tests
- **No other runtime dependencies**
- **Deployment:** GitHub Pages via GitHub Actions (primary), nginx on Hetzner (alternative)
- **Repo:** `TwentySidedStore/swiss-tournament`
- **Live URL:** `https://twentysidedstore.github.io/swiss-tournament/`

---

## Animations (CSS only)
- Match card expand/collapse: `max-height` transition, 150ms ease-out
- Button press: `transform: scale(0.97)`, 80ms
- Score button selected state: background fill, 100ms
- Tab content switch: cross-fade, 120ms
- Session recovery banner: auto-dismiss fade after 5 seconds
- **Do not animate:** table row sorting (stutters at 256 rows), round nav transitions, modal entry (simple opacity fade only)
- All animations respect `prefers-reduced-motion`

---

## Build Order
1. Vite + React + Tailwind project setup (color tokens, fonts, app shell, print stylesheet skeleton)
2. Core state management (useReducer, localStorage, null guards, session recovery, new tournament flow)
3. Registration UI (player input, bulk add, player list, tournament name/date, round-count selector, empty states)
4. Round 1 pairing + match card display (compact view with player records, round nav, left-border status indicators)
5. Stats engine (result derivation via deriveResult(), all stat computations from match data, tiebreaker sort, useMemo)
6. Score entry UI (quick-select presets, [+Draw] increment, expanded card)
7. Standings table (semantic table, sticky header, mobile sticky columns, live tiebreakers, sortable by name)
8. Rounds 2+ pairing algorithm (phantom BYE, backtracking, rematch fallback)
9. Round completion + next round generation + tournament finish (Start Round N with incomplete count, Complete Round confirmation, Finish Tournament, round stack push)
10. Delete round / rollback (Delete Round confirmation with type DELETE, stack pop, unlock previous)
11. Late player additions (player panel, assigned losses, current-round modal, pairing-editor integration)
12. Manual pairing override (break + rebuild, two-panel, sticky selection chip)
13. Accessibility pass (contrast verification, keyboard nav, ARIA, screen reader, focus indicators)
14. Polish (animations, empty states, responsive fine-tuning, print stylesheet, edge case testing)

---

## Future Enhancements (not in v1)
- Cut to top 8
- Tournament archive / history
- Download / export final standings (CSV, JSON)
- Table / seat number assignments
- Drop player mid-tournament
- Undo last action
- Delete tournament (distinct from New Tournament — with confirmation)
- Internal player database (persistent across tournaments)
- Calendar view for events (chronological event history)
