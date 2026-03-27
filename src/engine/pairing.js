import { computePlayerStats } from './stats'

export const BYE_PHANTOM = { id: 'BYE_PHANTOM', name: 'BYE' }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function createMatch(id, p1Id, p2Id) {
  if (p2Id === BYE_PHANTOM.id) {
    return {
      id,
      player1Id: p1Id,
      player2Id: null,
      type: 'bye',
      games: { p1Wins: 2, p2Wins: 0, draws: 0 },
    }
  }
  if (p1Id === BYE_PHANTOM.id) {
    return {
      id,
      player1Id: p2Id,
      player2Id: null,
      type: 'bye',
      games: { p1Wins: 2, p2Wins: 0, draws: 0 },
    }
  }
  return {
    id,
    player1Id: p1Id,
    player2Id: p2Id,
    type: 'normal',
    games: { p1Wins: 0, p2Wins: 0, draws: 0 },
  }
}

export function buildFacedMap(completedRounds) {
  const faced = new Map()

  const ensure = (id) => {
    if (!faced.has(id)) faced.set(id, new Set())
  }

  for (const round of completedRounds) {
    for (const match of round.matches) {
      const { player1Id, player2Id, type } = match
      ensure(player1Id)

      if (type === 'bye') {
        faced.get(player1Id).add(BYE_PHANTOM.id)
      } else if (type === 'normal' && player2Id != null) {
        ensure(player2Id)
        faced.get(player1Id).add(player2Id)
        faced.get(player2Id).add(player1Id)
      }
      // assigned_loss: no opponent, nothing to add
    }
  }

  return faced
}

export function generateRound1Pairings(players, startMatchId) {
  let nextMatchId = startMatchId
  const shuffled = shuffle(players)
  const pool = shuffled.length % 2 !== 0 ? [...shuffled, BYE_PHANTOM] : [...shuffled]

  const matches = []
  for (let i = 0; i < pool.length; i += 2) {
    matches.push(createMatch(nextMatchId++, pool[i].id, pool[i + 1].id))
  }

  return { matches, nextMatchId }
}

export function generateRoundNPairings(players, completedRounds, startMatchId) {
  let nextMatchId = startMatchId

  // Compute stats to get match points for sorting
  const stats = computePlayerStats(players, completedRounds)

  // Build faced map
  const faced = buildFacedMap(completedRounds)

  // Build pool with BYE_PHANTOM if odd
  const pool = [...players]
  if (pool.length % 2 !== 0) {
    pool.push(BYE_PHANTOM)
  }

  // Get match points for each player (BYE_PHANTOM gets -Infinity)
  const getPoints = (p) => {
    if (p.id === BYE_PHANTOM.id) return -Infinity
    return stats.get(p.id)?.matchPoints ?? 0
  }

  // Sort by match points descending, shuffle within point groups
  const pointGroups = new Map()
  for (const p of pool) {
    const pts = getPoints(p)
    if (!pointGroups.has(pts)) pointGroups.set(pts, [])
    pointGroups.get(pts).push(p)
  }

  const sortedPoints = [...pointGroups.keys()].sort((a, b) => b - a)
  const sorted = []
  for (const pts of sortedPoints) {
    sorted.push(...shuffle(pointGroups.get(pts)))
  }

  // Check if two players can be paired (haven't faced each other)
  const canPair = (a, b) => {
    const aFaced = faced.get(a.id)
    if (aFaced && aFaced.has(b.id)) return false
    const bFaced = faced.get(b.id)
    if (bFaced && bFaced.has(a.id)) return false
    return true
  }

  // Backtracking pairer
  function backtrack(remaining) {
    if (remaining.length === 0) return []

    const player = remaining[0]
    const rest = remaining.slice(1)

    for (let i = 0; i < rest.length; i++) {
      const candidate = rest[i]
      if (!canPair(player, candidate)) continue

      const newRemaining = [...rest.slice(0, i), ...rest.slice(i + 1)]
      const result = backtrack(newRemaining)
      if (result !== null) {
        return [[player, candidate], ...result]
      }
    }

    return null // dead end
  }

  let pairings = backtrack(sorted)

  // Fallback: if no valid pairing found, re-run without constraints
  if (pairings === null) {
    const fallback = []
    const remaining = [...sorted]
    while (remaining.length >= 2) {
      fallback.push([remaining.shift(), remaining.shift()])
    }
    pairings = fallback
  }

  // Convert to match objects
  const matches = pairings.map(([p1, p2]) => createMatch(nextMatchId++, p1.id, p2.id))

  return { matches, nextMatchId }
}
