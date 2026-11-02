import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AD_INTERVAL_MS, CompletionCoordinator, RESULTS_READ_MS, type Completion } from './completion'

function fixture(stored = { seen: [] as string[], lastAttempt: 0 }) {
  let route = '/ROOM/player/guest', visible = true, finished = true
  const show = vi.fn(async (current: () => boolean) => current())
  const preload = vi.fn(async () => {})
  const write = vi.fn(value => Object.assign(stored, value))
  const deps = { now: Date.now, read: () => stored, write, preload, show, visible: () => visible, route: () => route }
  const coordinator = new CompletionCoordinator(deps)
  const completion: Completion = { session: 'room:ROOM:one', route, mode: 'classic' }
  return { coordinator, completion, deps, show, preload, stored, current: () => finished, setRoute: (v: string) => { route = v }, hide: () => { visible = false }, newGame: () => { finished = false } }
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02T12:00:00Z')) })
afterEach(() => { vi.useRealTimers() })

describe('shared final-results ad break', () => {
  it.each(['classic', 'career', 'h2h', 'higher-lower', 'practice'])('shows once after readable %s final results', async mode => {
    const f = fixture()
    const completion = { ...f.completion, mode, route: mode === 'practice' ? '/app/practice' : f.completion.route }
    f.setRoute(completion.route)
    f.coordinator.observeActive(completion)
    f.coordinator.complete(completion, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS - 1)
    expect(f.show).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(f.show).toHaveBeenCalledOnce()
  })
  it('does not advertise from restored final results', async () => {
    const f = fixture()
    f.coordinator.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(f.show).not.toHaveBeenCalled()
  })
  it('does not advertise when returning to results after leaving the active game', async () => {
    const f = fixture()
    f.coordinator.observeActive(f.completion)
    f.coordinator.abandon(f.completion.session)
    f.coordinator.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    expect(f.show).not.toHaveBeenCalled()
  })
  it('deduplicates callbacks, remounts and results revisits, including reload', async () => {
    const f = fixture()
    f.coordinator.observeActive(f.completion)
    f.coordinator.complete(f.completion, f.current)
    f.coordinator.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    const reloaded = new CompletionCoordinator(f.deps)
    reloaded.observeActive(f.completion)
    reloaded.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(AD_INTERVAL_MS)
    expect(f.show).toHaveBeenCalledOnce()
  })
  it.each(['cleanup', 'new game', 'navigation', 'background'])('cancels delayed placement on %s', async reason => {
    const f = fixture()
    f.coordinator.observeActive(f.completion)
    const cleanup = f.coordinator.complete(f.completion, f.current)
    if (reason === 'cleanup') cleanup()
    if (reason === 'new game') f.newGame()
    if (reason === 'navigation') f.setRoute('/app')
    if (reason === 'background') f.hide()
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    expect(f.show).not.toHaveBeenCalled()
    expect(f.stored.seen).toContain(f.completion.session)
  })
  it('passes cancellation through an asynchronous native presenter', async () => {
    const f = fixture()
    let check!: () => boolean
    f.show.mockImplementation(async current => { check = current; return true })
    f.coordinator.observeActive(f.completion)
    const cleanup = f.coordinator.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    expect(check()).toBe(true)
    cleanup()
    expect(check()).toBe(false)
  })
  it('shares the three minute cap across different modes and sessions', async () => {
    const f = fixture()
    f.coordinator.observeActive(f.completion)
    f.coordinator.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    const second = { ...f.completion, mode: 'career', session: 'two' }
    f.coordinator.observeActive(second); f.coordinator.complete(second, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    expect(f.show).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(AD_INTERVAL_MS)
    const third = { ...second, session: 'three' }
    f.coordinator.observeActive(third); f.coordinator.complete(third, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    expect(f.show).toHaveBeenCalledTimes(2)
  })
  it('skips an unready ad rather than showing after a late load', async () => {
    const f = fixture()
    f.show.mockResolvedValue(false)
    f.coordinator.observeActive(f.completion)
    f.coordinator.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    f.show.mockResolvedValue(true)
    f.coordinator.complete(f.completion, f.current)
    await vi.advanceTimersByTimeAsync(AD_INTERVAL_MS)
    expect(f.show).toHaveBeenCalledOnce()
  })
  it.each(['/ROOM/game', '/ROOM/setup', '/ROOM/lobby', '/app/daily', '/privacy', '/offline.html'])('excludes %s', async route => {
    const f = fixture(), completion = { ...f.completion, route }
    f.setRoute(route)
    f.coordinator.observeActive(completion)
    f.coordinator.complete(completion, f.current)
    await vi.advanceTimersByTimeAsync(RESULTS_READ_MS)
    expect(f.preload).not.toHaveBeenCalled()
    expect(f.show).not.toHaveBeenCalled()
  })
})
