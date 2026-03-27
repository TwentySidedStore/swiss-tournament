export function recommendedRounds(playerCount) {
  if (playerCount < 2) return 0
  return Math.ceil(Math.log2(playerCount))
}

export function defaultRounds(playerCount) {
  return Math.min(3, recommendedRounds(playerCount))
}
