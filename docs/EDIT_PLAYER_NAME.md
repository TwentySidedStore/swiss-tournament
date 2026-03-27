# Edit Player Name — Implementation Plan

## Overview

Allow editing player names at any time — during registration and mid-tournament. Inline edit triggered by a pencil icon (hover-reveal, like the delete button). Player ID is unchanged, so all match data, stats, and pairings are unaffected.

## Reducer

### New Action

**EDIT_PLAYER** `{ playerId: number, name: string }`
- Updates `players[].name` where `id === playerId`
- No guards — works anytime (registration or mid-tournament)
- Trims whitespace. If trimmed name is empty, no-op.

## UI

### Shared EditableName Component

Both `PlayerList.jsx` (registration) and `PlayerPanel.jsx` (tournament) use the same inline edit pattern. Extract to a shared component:

**EditableName.jsx**
```
Props: name, onSave: (newName: string) => void
Local state: isEditing (boolean), editValue (string)
```

**Display mode** (default):
- Player name as text
- Pencil icon on hover/focus (same opacity pattern as delete button: `opacity-0 group-hover:opacity-100 focus:opacity-100`)
- Click pencil → enter edit mode

**Edit mode:**
- Text input replaces the name, pre-filled with current name, auto-focused, text selected
- Enter → save (calls `onSave` with trimmed value, exits edit mode)
- Escape → cancel (reverts to original name, exits edit mode)
- Blur → save (same as Enter)
- Input sized to fit content (or full available width)

### Component Changes

**PlayerList.jsx**
- Replace static name `<span>` with `<EditableName>` component
- `onSave` dispatches `EDIT_PLAYER`
- Pencil icon sits between the name and the remove button

**PlayerPanel.jsx**
- Replace static name in the player list with `<EditableName>`
- `onSave` dispatches `EDIT_PLAYER` via a new `onEditPlayer` prop
- Only show pencil when `tournamentStarted` is true (during registration, PlayerList handles it)

### Accessibility

- Pencil button: `aria-label="Edit {player name}"`
- Edit input: `aria-label="Player name"`
- Focus moves to input on edit, returns to pencil on save/cancel
- Keyboard: Tab to pencil, Enter/Space to activate, then type, Enter to save, Escape to cancel

## Test Plan (TDD)

### reducer.test.js

```
EDIT_PLAYER: updates the correct player's name
EDIT_PLAYER: trims whitespace
EDIT_PLAYER: no-op for empty name after trim
EDIT_PLAYER: no-op for non-existent playerId
EDIT_PLAYER: works during tournament (tournamentStarted: true)
```

### EditableName component test (optional, can verify in browser)

```
Renders name in display mode
Shows pencil on hover
Clicking pencil enters edit mode with input
Enter saves new name
Escape cancels edit
Blur saves
```

## File Structure

```
src/
├── state/
│   ├── reducer.js           (CHANGED — add EDIT_PLAYER)
│   ├── reducer.test.js      (CHANGED — add EDIT_PLAYER tests)
│   └── actions.js           (CHANGED — add EDIT_PLAYER constant)
├── components/
│   ├── ui/
│   │   └── EditableName.jsx (NEW)
│   ├── registration/
│   │   └── PlayerList.jsx   (CHANGED — use EditableName)
│   └── PlayerPanel.jsx      (CHANGED — use EditableName, add onEditPlayer prop)
├── App.jsx                  (CHANGED — pass onEditPlayer to Header/PlayerPanel)
└── Header.jsx               (CHANGED — pass onEditPlayer through to PlayerPanel)
```

## Build Order

1. **Add EDIT_PLAYER to reducer** — tests first, then implement
2. **Create EditableName component** — pencil icon, inline input, Enter/Escape/Blur handling
3. **Wire into PlayerList** — registration view
4. **Wire into PlayerPanel** — tournament view (pass onEditPlayer through Header → PlayerPanel)
5. **Verify** — build + test + manual check in browser
