import { monetizationBreakReached } from '../playam-monetization'

export type Completion = { session: string; route: string; mode: string }
export interface CompletionDependencies {
  now(): number
  read(): { seen: string[]; lastAttempt: number }
  write(value: { seen: string[]; lastAttempt: number }): void
  preload(): Promise<void>
  show(current: () => boolean): Promise<boolean>
  visible(): boolean
  route(): string
}
export const RESULTS_READ_MS = 3000
export const AD_INTERVAL_MS = 180_000

/** Shared by every eligible mode; render alone/restored results cannot qualify. */
export class CompletionCoordinator {
  private active = new Set<string>()
  private seen: Set<string>
  private lastAttempt: number
  constructor(private deps: CompletionDependencies) {
    const stored = deps.read()
    this.seen = new Set(stored.seen)
    this.lastAttempt = stored.lastAttempt
  }
  private save() {
    this.deps.write({ seen: [...this.seen], lastAttempt: this.lastAttempt })
  }
  observeActive(completion: Completion) {
    if (!this.eligible(completion) || this.seen.has(completion.session)) return
    this.active.add(completion.session)
    void this.deps.preload().catch(() => {})
  }
  abandon(session: string) { this.active.delete(session) }
  private eligible(c: Completion) {
    return ['classic', 'career', 'h2h', 'higher-lower', 'practice'].includes(c.mode)
      && (c.route === '/app/practice' || /^\/[^/]+\/player\/[^/]+\/?$/.test(c.route))
      && monetizationBreakReached({ game: 'stats-master', route: c.route, gameMode: c.mode, contentSource: 'curated', phase: 'results', completed: true })
  }
  complete(completion: Completion, stillFinished: () => boolean): () => void {
    if (!this.eligible(completion) || !this.active.delete(completion.session) || this.seen.has(completion.session)) return () => {}
    // Consume even if canceled, offline, rate limited, or not preloaded. Never retry
    // on a results revisit, delayed callback, restored session or next game.
    this.seen.add(completion.session)
    this.save()
    let canceled = false
    const current = () => !canceled && stillFinished() && this.deps.visible() && this.deps.route() === completion.route
    const timer = setTimeout(() => {
      if (!current() || (this.lastAttempt > 0 && this.deps.now() - this.lastAttempt < AD_INTERVAL_MS)) return
      this.lastAttempt = this.deps.now() // Reserve atomically across simultaneous callbacks.
      this.save()
      void this.deps.show(current).catch(() => {})
    }, RESULTS_READ_MS)
    return () => { canceled = true; clearTimeout(timer) }
  }
}
