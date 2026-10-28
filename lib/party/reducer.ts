import { produce } from 'immer'
import { mutations } from './rules'
import type { GameState } from '../../types/game'
import type { RoomAction } from './protocol'

/** All authorization uses the signed socket identity, never a claimed requester. */
export function applyRoomAction(
  state: GameState,
  me: string,
  online: ReadonlySet<string>,
  action: RoomAction,
): GameState {
  if (!me || !online.has(me)) return state
  const args = action.args
  if (typeof args === 'string' && args !== me) return state
  if (typeof args === 'object') {
    if ('requesterId' in args && args.requesterId !== me) return state
    if ('id' in args && args.id !== me) return state
    if ('playerId' in args && action.type !== 'assignBoss' && args.playerId !== me) return state
  }
  const participant = state.players.some((p) => p.id === me)
  if (
    [
      'submitAnswer',
      'submitCareerAnswer',
      'buzzIn',
      'cancelCareerBuzz',
      'activatePowerup',
    ].includes(action.type) &&
    !participant
  )
    return state
  const controller = me === state.hostId || me === state.bossId
  if (action.type === 'requestHint' && !controller && !participant) return state
  if (action.type === 'requestHint' && state.command !== 'answering') return state
  if (
    action.type === 'saveSettings' &&
    (!controller || !['idle', 'rematch', 'finished'].includes(state.command))
  )
    return state
  if (action.type === 'startGame') {
    if (!['idle', 'rematch'].includes(state.command)) return state
    const { questionSequence, careerData, h2hPairs, hlPairs } = action.args
    const mode = action.args.gameMode ?? state.gameMode
    const count = questionSequence.length
    if (mode === 'career' && careerData?.length !== count) return state
    if (mode === 'h2h' && h2hPairs?.length !== count) return state
    if (mode === 'higher-lower' && hlPairs?.length !== count) return state
  }
  if (
    action.type === 'assignBoss' &&
    action.args.playerId &&
    !state.players.some((p) => p.id === action.args.playerId)
  )
    return state
  if (action.type === 'claimBoss' && !participant) return state
  if (action.type === 'tickCountdown' && state.command !== 'starting') return state
  if (action.type === 'advanceToNext' && state.command !== 'revealing') return state
  const modes: Partial<Record<RoomAction['type'], GameState['gameMode']>> = {
    nextQuestion: 'classic',
    revealAnswers: 'classic',
    activatePowerup: 'classic',
    nextCareerRound: 'career',
    revealCareerAnswer: 'career',
    submitCareerAnswer: 'career',
    nextH2HRound: 'h2h',
    revealH2HAnswers: 'h2h',
    nextHLRound: 'higher-lower',
    revealHLAnswers: 'higher-lower',
  }
  if (modes[action.type] && modes[action.type] !== state.gameMode) return state
  if (action.type === 'submitAnswer' && state.gameMode === 'career') return state
  return produce(state, (game) => {
    // The final board can open setup directly, without pressing Rematch first.
    if (action.type === 'saveSettings' && game.command === 'finished') mutations.rematch(game, me)
    switch (action.type) {
      case 'joinGame':
        mutations.joinGame(game, action.args)
        break
      case 'claimBoss':
        mutations.claimBoss(game, action.args)
        break
      case 'assignBoss':
        mutations.assignBoss(game, action.args)
        break
      case 'saveSettings':
        mutations.saveSettings(game, action.args)
        break
      case 'startGame':
        mutations.startGame(game, action.args)
        break
      case 'setGamePaused':
        mutations.setGamePaused(game, action.args)
        break
      case 'tickCountdown':
        mutations.tickCountdown(game, action.args)
        break
      case 'nextQuestion':
        mutations.nextQuestion(game, action.args)
        break
      case 'revealNextColumn':
        mutations.revealNextColumn(game, action.args)
        break
      case 'submitAnswer':
        mutations.submitAnswer(game, action.args)
        break
      case 'revealAnswers':
        mutations.revealAnswers(game, action.args)
        break
      case 'advanceToNext':
        mutations.advanceToNext(game, action.args)
        break
      case 'skipQuestion':
        mutations.skipQuestion(game, action.args)
        break
      case 'requestHint':
        mutations.requestHint(game, action.args)
        break
      case 'activatePowerup':
        mutations.activatePowerup(game, action.args)
        break
      case 'finishGame':
        mutations.finishGame(game, action.args)
        break
      case 'rematch':
        mutations.rematch(game, action.args)
        break
      case 'refreshCareerData':
        mutations.refreshCareerData(game, action.args)
        break
      case 'nextCareerRound':
        mutations.nextCareerRound(game, action.args)
        break
      case 'revealNextCareerSeason':
        mutations.revealNextCareerSeason(game, action.args)
        break
      case 'buzzIn':
        mutations.buzzIn(game, action.args)
        break
      case 'cancelCareerBuzz':
        mutations.cancelCareerBuzz(game, action.args)
        break
      case 'submitCareerAnswer':
        mutations.submitCareerAnswer(game, action.args)
        break
      case 'revealCareerAnswer':
        mutations.revealCareerAnswer(game, action.args)
        break
      case 'nextH2HRound':
        mutations.nextH2HRound(game, action.args)
        break
      case 'revealH2HAnswers':
        mutations.revealH2HAnswers(game, action.args)
        break
      case 'nextHLRound':
        mutations.nextHLRound(game, action.args)
        break
      case 'revealHLAnswers':
        mutations.revealHLAnswers(game, action.args)
        break
    }
  })
}
