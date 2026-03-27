export function deriveResult({ p1Wins, p2Wins, draws }) {
  if (p1Wins === 0 && p2Wins === 0 && draws === 0) return null
  if (p1Wins > p2Wins) return 'p1_win'
  if (p2Wins > p1Wins) return 'p2_win'
  return 'draw'
}

export function computePlayerStats(players, rounds) {
  const stats = new Map()

  // Initialize every player with zero stats
  for (const player of players) {
    stats.set(player.id, {
      matchRecord: { w: 0, l: 0, d: 0 },
      gameRecord: { w: 0, l: 0, d: 0 },
      matchPoints: 0,
      gamePoints: 0,
      gamesPlayed: 0,
      opponents: [],
      hasBye: false,
      roundsCompleted: 0,
    })
  }

  for (const round of rounds) {
    // Track which players have a result this round
    const playersWithResult = new Set()

    for (const match of round.matches) {
      const { player1Id, player2Id, type, games } = match
      const result = deriveResult(games)
      const totalGames = games.p1Wins + games.p2Wins + games.draws

      const s1 = stats.get(player1Id)
      if (!s1) continue

      // Accumulate game records for p1
      s1.gamesPlayed += totalGames
      s1.gameRecord.w += games.p1Wins
      s1.gameRecord.l += games.p2Wins
      s1.gameRecord.d += games.draws
      playersWithResult.add(player1Id)

      if (type === 'bye') {
        s1.hasBye = true
        // Bye = match win, but no opponent added
        s1.matchRecord.w += 1
      } else if (type === 'assigned_loss') {
        // Assigned loss = match loss, no opponent added
        s1.matchRecord.l += 1
      } else if (type === 'normal' && result !== null) {
        // Real match — add opponent
        s1.opponents.push(player2Id)

        if (result === 'p1_win') s1.matchRecord.w += 1
        else if (result === 'p2_win') s1.matchRecord.l += 1
        else if (result === 'draw') s1.matchRecord.d += 1

        // Accumulate for p2
        const s2 = stats.get(player2Id)
        if (s2) {
          s2.gamesPlayed += totalGames
          s2.gameRecord.w += games.p2Wins
          s2.gameRecord.l += games.p1Wins
          s2.gameRecord.d += games.draws
          s2.opponents.push(player1Id)
          playersWithResult.add(player2Id)

          if (result === 'p1_win') s2.matchRecord.l += 1
          else if (result === 'p2_win') s2.matchRecord.w += 1
          else if (result === 'draw') s2.matchRecord.d += 1
        }
      } else if (type === 'normal' && result === null) {
        // No result entered yet — still count as having appeared in round
        // but don't accumulate match record
        playersWithResult.add(player1Id)
        if (player2Id) playersWithResult.add(player2Id)
      }
    }

    // Count rounds completed per player
    for (const pid of playersWithResult) {
      const s = stats.get(pid)
      if (s) s.roundsCompleted += 1
    }
  }

  // Derive points
  for (const s of stats.values()) {
    s.matchPoints = s.matchRecord.w * 3 + s.matchRecord.d * 1
    s.gamePoints = s.gameRecord.w * 3 + s.gameRecord.d * 1
  }

  return stats
}

export function computeTiebreakers(playerStatsMap) {
  const tb = new Map()

  // Pass 1: compute each player's MWP and GWP
  for (const [id, stats] of playerStatsMap) {
    let mwp = 0
    if (stats.roundsCompleted > 0) {
      mwp = stats.matchPoints / (3 * stats.roundsCompleted)
      mwp = Math.max(mwp, 1 / 3)
    }

    let gwp = 0
    if (stats.gamesPlayed > 0) {
      gwp = stats.gamePoints / (3 * stats.gamesPlayed)
      gwp = Math.max(gwp, 1 / 3)
    }

    tb.set(id, { mwp, gwp, omwp: 0, ogwp: 0 })
  }

  // Pass 2: compute OMWP and OGWP
  for (const [id, stats] of playerStatsMap) {
    const opponents = stats.opponents
    if (opponents.length === 0) {
      tb.get(id).omwp = 0
      tb.get(id).ogwp = 0
      continue
    }

    let omwpSum = 0
    let ogwpSum = 0
    for (const oppId of opponents) {
      const oppTb = tb.get(oppId)
      if (oppTb) {
        omwpSum += Math.max(oppTb.mwp, 1 / 3)
        ogwpSum += Math.max(oppTb.gwp, 1 / 3)
      }
    }

    tb.get(id).omwp = omwpSum / opponents.length
    tb.get(id).ogwp = ogwpSum / opponents.length
  }

  return tb
}

export function sortStandings(players, statsMap, tiebreakersMap) {
  const entries = players.map((player) => ({
    player,
    stats: statsMap.get(player.id),
    tiebreakers: tiebreakersMap.get(player.id),
  }))

  entries.sort((a, b) => {
    // Match points descending
    const mpDiff = (b.stats?.matchPoints ?? 0) - (a.stats?.matchPoints ?? 0)
    if (mpDiff !== 0) return mpDiff

    // OMWP descending
    const omwpDiff = (b.tiebreakers?.omwp ?? 0) - (a.tiebreakers?.omwp ?? 0)
    if (Math.abs(omwpDiff) > 1e-9) return omwpDiff

    // GWP descending
    const gwpDiff = (b.tiebreakers?.gwp ?? 0) - (a.tiebreakers?.gwp ?? 0)
    if (Math.abs(gwpDiff) > 1e-9) return gwpDiff

    // OGWP descending
    const ogwpDiff = (b.tiebreakers?.ogwp ?? 0) - (a.tiebreakers?.ogwp ?? 0)
    if (Math.abs(ogwpDiff) > 1e-9) return ogwpDiff

    // Player ID ascending (stable tiebreak)
    return a.player.id - b.player.id
  })

  // Assign ranks (tied players share a rank)
  let rank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) {
      const prev = entries[i - 1]
      const curr = entries[i]
      const tied =
        (prev.stats?.matchPoints ?? 0) === (curr.stats?.matchPoints ?? 0) &&
        Math.abs((prev.tiebreakers?.omwp ?? 0) - (curr.tiebreakers?.omwp ?? 0)) < 1e-9 &&
        Math.abs((prev.tiebreakers?.gwp ?? 0) - (curr.tiebreakers?.gwp ?? 0)) < 1e-9 &&
        Math.abs((prev.tiebreakers?.ogwp ?? 0) - (curr.tiebreakers?.ogwp ?? 0)) < 1e-9
      if (!tied) rank = i + 1
    }
    entries[i].rank = rank
  }

  return entries
}
