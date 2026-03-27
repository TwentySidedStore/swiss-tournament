# Swiss Tournament Manager

MTG Swiss pairing app. React + Vite + Tailwind CSS.

## Architecture
- State: `useReducer`, persisted to `localStorage`. Rounds are a stack.
- All player stats **derived from match data** — never stored on player objects.
- `result` derived via `deriveResult(games)` — not stored on match objects.
- Stats: two-pass (MWP/GWP first, then OMW%/OGW%). Memoized.
- `editingPairings` and `expandedMatchId` are ephemeral — not persisted.

## Key Files
- `docs/PLAN.md` — Design spec (data model, algorithms, UI, accessibility)
- `docs/IMPLEMENTATION.md` — Execution spec (function signatures, reducer actions, component props, test plan)
- `src/engine/` — Pure logic: stats, pairing, round count (TDD)
- `src/state/` — Reducer, action types, persistence
- `src/components/` — React components by feature

## Commands
```bash
npm run dev       # Dev server
npm run build     # Production build → dist/
npm test          # Vitest
npm run preview   # Preview build
```

## Conventions
- Mobile-first (375px → `md:` 768px → `lg:` 1024px)
- TDD for engine and reducer
- Co-located tests (e.g. `stats.test.js` next to `stats.js`)
- WCAG 2.1 AA accessibility
- Dark theme only (light via `@media print`)
