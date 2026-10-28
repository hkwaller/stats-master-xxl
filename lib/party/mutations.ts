'use client'

import { useAction } from './client'

export function useJoinGame() {
  return useAction('joinGame')
}
export function useClaimBoss() {
  return useAction('claimBoss')
}
export function useAssignBoss() {
  return useAction('assignBoss')
}
export function useSaveSettings() {
  return useAction('saveSettings')
}
export function useStartGame() {
  return useAction('startGame')
}
export function useSetGamePaused() {
  return useAction('setGamePaused')
}
export function useTickCountdown() {
  return useAction('tickCountdown')
}
export function useNextQuestion() {
  return useAction('nextQuestion')
}
export function useRevealNextColumn() {
  return useAction('revealNextColumn')
}
export function useSubmitAnswer() {
  return useAction('submitAnswer')
}
export function useRevealAnswers() {
  return useAction('revealAnswers')
}
export function useAdvanceToNext() {
  return useAction('advanceToNext')
}
export function useSkipQuestion() {
  return useAction('skipQuestion')
}
export function useRequestHint() {
  return useAction('requestHint')
}
export function useActivatePowerup() {
  return useAction('activatePowerup')
}
export function useFinishGame() {
  return useAction('finishGame')
}
export function useRematch() {
  return useAction('rematch')
}
export function useRefreshCareerData() {
  return useAction('refreshCareerData')
}
export function useNextCareerRound() {
  return useAction('nextCareerRound')
}
export function useRevealNextCareerSeason() {
  return useAction('revealNextCareerSeason')
}
export function useBuzzIn() {
  return useAction('buzzIn')
}
export function useCancelCareerBuzz() {
  return useAction('cancelCareerBuzz')
}
export function useSubmitCareerAnswer() {
  return useAction('submitCareerAnswer')
}
export function useRevealCareerAnswer() {
  return useAction('revealCareerAnswer')
}
export function useNextH2HRound() {
  return useAction('nextH2HRound')
}
export function useRevealH2HAnswers() {
  return useAction('revealH2HAnswers')
}
export function useNextHLRound() {
  return useAction('nextHLRound')
}
export function useRevealHLAnswers() {
  return useAction('revealHLAnswers')
}
