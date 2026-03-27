import { useState, useEffect } from 'react'
import { Actions } from '../../state/actions'
import { deriveResult } from '../../engine/stats'
import RoundNav from './RoundNav'
import MatchCard from './MatchCard'
import RoundControls from './RoundControls'
import PairingEditor from './PairingEditor'

export default function RoundsTab({ state, dispatch, playerStats }) {
  const [expandedMatchId, setExpandedMatchId] = useState(null)
  const [editingPairings, setEditingPairings] = useState(false)

  // Reset expanded card and close editor when round changes
  useEffect(() => {
    setExpandedMatchId(null)
    setEditingPairings(false)
  }, [state.viewingRound])

  const round = state.rounds[state.viewingRound]
  if (!round) return null

  const playersById = Object.fromEntries(state.players.map((p) => [p.id, p]))
  const isActiveRound = state.viewingRound === state.activeRound
  const isLastRound = state.activeRound === state.maxRounds - 1

  const incompleteCount = round.matches.filter(
    (m) => m.type === 'normal' && deriveResult(m.games) === null,
  ).length

  const hasAnyNormalResults = round.matches.some(
    (m) => m.type === 'normal' && deriveResult(m.games) !== null,
  )
  const canEditPairings = isActiveRound && !round.locked && !hasAnyNormalResults

  const completedRounds = state.rounds.filter((r) => r.locked)

  if (editingPairings) {
    return (
      <div role="tabpanel" id="tabpanel-rounds" aria-labelledby="tab-rounds">
        <RoundNav
          viewingRound={state.viewingRound}
          totalRounds={state.rounds.length}
          activeRound={state.activeRound}
          onNavigate={(index) => dispatch({ type: Actions.SET_VIEWING_ROUND, index })}
        />
        <PairingEditor
          round={round}
          players={state.players}
          playerStats={playerStats}
          completedRounds={completedRounds}
          onSave={(matches) => {
            dispatch({ type: Actions.SAVE_PAIRINGS, roundIndex: state.viewingRound, matches })
            setEditingPairings(false)
          }}
          onCancel={() => setEditingPairings(false)}
        />
      </div>
    )
  }

  return (
    <div
      role="tabpanel"
      id="tabpanel-rounds"
      aria-labelledby="tab-rounds"
      onClick={(e) => {
        // Dismiss expanded card when clicking outside any match card
        if (expandedMatchId !== null && !e.target.closest('[data-match-card]')) {
          setExpandedMatchId(null)
        }
      }}
    >
      <RoundNav
        viewingRound={state.viewingRound}
        totalRounds={state.rounds.length}
        activeRound={state.activeRound}
        onNavigate={(index) => dispatch({ type: Actions.SET_VIEWING_ROUND, index })}
      />

      <div className="space-y-2">
        {round.matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            player1={playersById[match.player1Id]}
            player2={match.player2Id ? playersById[match.player2Id] : null}
            p1Stats={playerStats?.get(match.player1Id) ?? null}
            p2Stats={match.player2Id ? (playerStats?.get(match.player2Id) ?? null) : null}
            isExpanded={expandedMatchId === match.id}
            onToggleExpand={() =>
              setExpandedMatchId(expandedMatchId === match.id ? null : match.id)
            }
            onSetGames={(games) =>
              dispatch({ type: Actions.SET_MATCH_RESULT, matchId: match.id, games })
            }
          />
        ))}
      </div>

      <RoundControls
        round={round}
        isActiveRound={isActiveRound}
        incompleteCount={incompleteCount}
        isLastRound={isLastRound}
        tournamentComplete={state.tournamentComplete}
        onCompleteRound={() => dispatch({ type: Actions.COMPLETE_ROUND })}
        onDeleteRound={() => dispatch({ type: Actions.DELETE_ROUND })}
        onFinishTournament={() => dispatch({ type: Actions.FINISH_TOURNAMENT })}
        onReopenTournament={() => dispatch({ type: Actions.REOPEN_TOURNAMENT })}
        onEditPairings={() => setEditingPairings(true)}
        canEditPairings={canEditPairings}
      />
    </div>
  )
}
