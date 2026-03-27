import { Actions } from '../../state/actions'
import TabBar from './TabBar'
import RoundsTab from './RoundsTab'
import StandingsTable from '../standings/StandingsTable'

export default function Tournament({ state, dispatch, playerStats, tiebreakers, standings }) {
  return (
    <div>
      <TabBar
        currentTab={state.currentTab}
        activeRound={state.activeRound}
        onTabChange={(tab) => dispatch({ type: Actions.SET_TAB, tab })}
      />

      {state.currentTab === 'rounds' && (
        <RoundsTab state={state} dispatch={dispatch} playerStats={playerStats} />
      )}

      {state.currentTab === 'standings' && (
        <StandingsTable
          standings={standings}
          tournamentComplete={state.tournamentComplete}
          tournamentName={state.tournamentName}
          tournamentDate={state.tournamentDate}
          onNewTournament={() => dispatch({ type: Actions.NEW_TOURNAMENT })}
          onReopenTournament={() => dispatch({ type: Actions.REOPEN_TOURNAMENT })}
        />
      )}
    </div>
  )
}
