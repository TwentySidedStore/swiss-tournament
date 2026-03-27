# Twenty Sided Swiss Pairings
 
MTG Swiss tournament manager.
 
## Tech Stack
 
- Single `index.html` — HTML + CSS + vanilla JS, no build step
- No frameworks, no npm, no external dependencies
- No localStorage — all state in memory
- Must work by opening the file directly in a browser
 
## Commands
 
```bash
open index.html
python3 -m http.server 8000  # if local server needed
```
 
## Before Building
 
Read `PLAN.md` — it has the full spec, data model, formulas, edge cases, and UI flow.
 
## Gotchas
 
- OMW%/OGW% exclude byes from the opponent list — a bye is NOT an opponent
- Game-win % uses game points (3×wins + 1×draws) / (3 × total games), not just win rate
- Match result is derived from game wins, not entered directly
- Locked rounds are truly immutable
- Manual pairing edits disabled once any result is entered for that round