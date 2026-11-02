export type Consent = { canRequestAds: boolean; required: boolean; formAvailable: boolean; privacyRequired: boolean }
export type AdState = 'idle' | 'loading' | 'loaded' | 'showing' | 'dismissed' | 'failed'
export interface AdSdk {
  consent(): Promise<Consent>
  consentForm(): Promise<Consent>
  privacyForm(): Promise<void>
  initialize(): Promise<void>
  load(): Promise<void>
  show(): Promise<void>
  listen(event: 'dismissed' | 'failed' | 'showed', callback: () => void): Promise<{ remove(): Promise<void> }>
}
export interface AdDependencies {
  supported(): boolean
  free(): boolean
  visible(): boolean
  consentSafe(): boolean
  phoneReady(): Promise<boolean>
  sdk(): Promise<AdSdk>
  now(): number
}

/** One owner of consent, cache and the full-screen presentation lock. */
export class AdController {
  state: AdState = 'idle'
  privacyRequired = false
  private allowed = false
  private initialized = false
  private sdkInstance?: AdSdk
  private bootstrapOperation?: Promise<void>
  private preloadOperation?: Promise<void>
  private privacyOperation?: Promise<boolean>
  private generation = 0
  private permissionGeneration = 0
  private loadedAt = 0
  private presenting = false
  private handles: { remove(): Promise<void> }[] = []
  private subscribers = new Set<() => void>()
  constructor(private deps: AdDependencies) {}
  subscribe = (callback: () => void) => {
    this.subscribers.add(callback)
    return () => { this.subscribers.delete(callback) }
  }
  private publish() { this.subscribers.forEach(callback => callback()) }
  private eligible() { return this.deps.supported() && this.deps.free() }
  invalidate() {
    this.generation++
    this.loadedAt = 0
    if (!this.presenting) this.state = 'idle'
    this.publish()
  }
  invalidatePermission() {
    this.permissionGeneration++
    this.allowed = false
    this.invalidate()
  }
  private applyConsent(info: Consent) {
    this.allowed = info.canRequestAds === true
    this.privacyRequired = info.privacyRequired
    this.publish()
  }
  /** Call at a safe launch surface, never from a question or results timer. */
  bootstrap(): Promise<void> {
    if (!this.eligible()) return Promise.resolve()
    if (this.bootstrapOperation) return this.bootstrapOperation
    this.bootstrapOperation = this.runBootstrap().finally(() => { this.bootstrapOperation = undefined })
    return this.bootstrapOperation
  }
  private async runBootstrap() {
    const permission = this.permissionGeneration
    try {
      if (!this.deps.consentSafe() || !this.deps.visible() || !await this.deps.phoneReady() || !this.eligible()) return
      const sdk = this.sdkInstance ?? await this.deps.sdk()
      this.sdkInstance = sdk
      let consent = await sdk.consent()
      if (permission !== this.permissionGeneration || !this.eligible()) return
      this.privacyRequired = consent.privacyRequired
      this.publish()
      if (consent.required && consent.formAvailable) {
        if (!this.deps.consentSafe() || !this.deps.visible() || !await this.deps.phoneReady()) return
        consent = await sdk.consentForm()
      }
      if (permission !== this.permissionGeneration || !this.eligible()) return
      this.applyConsent(consent)
      if (!this.allowed) return
      if (!this.initialized) {
        await sdk.initialize()
        this.initialized = true
      }
      if (permission === this.permissionGeneration && this.eligible()) await this.preload()
    } catch {
      if (permission !== this.permissionGeneration) return
      // A failed refresh/form is never permission, including with a cached ad.
      this.allowed = false
      this.invalidate()
      this.state = 'failed'
      this.publish()
    }
  }
  preload(): Promise<void> {
    if (!this.eligible() || !this.deps.visible() || !this.allowed || !this.initialized || this.presenting || this.privacyOperation) return Promise.resolve()
    if (this.preloadOperation) return this.preloadOperation
    if (this.state === 'loaded' && this.deps.now() - this.loadedAt < 50 * 60_000) return Promise.resolve()
    this.preloadOperation = this.load().finally(() => { this.preloadOperation = undefined })
    return this.preloadOperation
  }
  private async load() {
    const generation = this.generation
    this.state = 'loading'; this.publish()
    try {
      await this.sdkInstance!.load()
      if (generation !== this.generation || !this.eligible() || !this.allowed) return
      this.loadedAt = this.deps.now()
      this.state = 'loaded'
    } catch { if (generation === this.generation) this.state = 'failed' }
    this.publish()
  }
  async showIfReady(current: () => boolean): Promise<boolean> {
    if (!this.eligible() || !this.allowed || this.privacyOperation || this.presenting || this.state !== 'loaded' || this.deps.now() - this.loadedAt >= 50 * 60_000 || !this.deps.visible() || !current()) return false
    this.presenting = true // Acquire before the first await.
    const generation = this.generation
    const handles: { remove(): Promise<void> }[] = []
    let released = false
    const release = (state: AdState) => {
      if (released) return
      released = true
      this.presenting = false
      this.state = state
      this.loadedAt = 0
      const stale = handles.splice(0)
      this.handles = this.handles.filter(handle => !stale.includes(handle))
      void Promise.allSettled(stale.map(handle => handle.remove()))
      this.publish()
    }
    try {
      if (!await this.deps.phoneReady()) { this.presenting = false; return false }
      const sdk = this.sdkInstance!
      for (const [event, callback] of [
        ['dismissed', () => release('dismissed')],
        ['failed', () => release('failed')],
        ['showed', () => { if (!released) { this.state = 'showing'; this.publish() } }],
      ] as const) {
        const handle = await sdk.listen(event, callback)
        handles.push(handle); this.handles.push(handle)
      }
      // Recheck after every asynchronous preparation, immediately before native show.
      if (generation !== this.generation || !this.eligible() || !this.allowed || !this.deps.visible() || !current()) {
        release('idle'); return false
      }
      this.state = 'showing'; this.publish()
      await sdk.show()
      return true // Dismiss/failure events, not this promise, release the lock.
    } catch { release('failed'); return false }
  }
  privacyChoices(): Promise<boolean> {
    if (this.privacyOperation) return this.privacyOperation
    if (!this.deps.supported() || this.presenting) return Promise.resolve(false)
    this.invalidatePermission()
    this.privacyOperation = (async () => {
      try {
        if (!this.deps.consentSafe() || !this.deps.visible() || !await this.deps.phoneReady()) return false
        const sdk = this.sdkInstance ?? await this.deps.sdk()
        this.sdkInstance = sdk
        if (!this.deps.consentSafe()) return false
        await sdk.privacyForm()
        this.applyConsent(await sdk.consent())
        return true
      } catch { this.allowed = false; this.invalidate(); return false }
    })().finally(() => { this.privacyOperation = undefined }).then(success => {
      if (success && this.eligible() && this.deps.consentSafe()) void this.bootstrap()
      return success
    })
    return this.privacyOperation
  }
  dispose() {
    this.invalidatePermission()
    const handles = this.handles.splice(0)
    void Promise.allSettled(handles.map(handle => handle.remove()))
    this.subscribers.clear()
  }
}
