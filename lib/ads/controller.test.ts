import { describe, expect, it, vi } from 'vitest'
import { AdController, type AdSdk, type Consent } from './controller'

const permitted: Consent = { canRequestAds: true, required: false, formAvailable: false, privacyRequired: true }
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
function fixture() {
  let free = true, phone = true, visible = true, safe = true, supported = true, now = 1000
  const callbacks = new Map<string, () => void>()
  const remove = vi.fn(async () => {})
  const sdk: AdSdk = {
    consent: vi.fn(async () => permitted),
    consentForm: vi.fn(async () => permitted),
    privacyForm: vi.fn(async () => {}),
    initialize: vi.fn(async () => {}),
    load: vi.fn(async () => {}),
    show: vi.fn(async () => {}),
    listen: vi.fn(async (event, callback) => { callbacks.set(event, callback); return { remove } }),
  }
  const controller = new AdController({
    supported: () => supported, free: () => free, visible: () => visible, consentSafe: () => safe,
    phoneReady: vi.fn(async () => phone), sdk: vi.fn(async () => sdk), now: () => now,
  })
  return { controller, sdk, remove, callbacks, setFree: (v: boolean) => { free = v; controller.invalidate() }, setPhone: (v: boolean) => { phone = v }, setVisible: (v: boolean) => { visible = v }, setSafe: (v: boolean) => { safe = v }, setSupported: (v: boolean) => { supported = v }, age: () => { now += 60 * 60_000 } }
}

describe('native ad controller', () => {
  it.each(['browser/old shell', 'paid/unknown', 'TV/mirroring', 'hidden', 'active game'])('skips bootstrap on %s', async reason => {
    const f = fixture()
    if (reason === 'browser/old shell') f.setSupported(false)
    if (reason === 'paid/unknown') f.setFree(false)
    if (reason === 'TV/mirroring') f.setPhone(false)
    if (reason === 'hidden') f.setVisible(false)
    if (reason === 'active game') f.setSafe(false)
    await f.controller.bootstrap()
    expect(f.sdk.consent).not.toHaveBeenCalled()
    expect(f.sdk.initialize).not.toHaveBeenCalled()
    expect(await f.controller.showIfReady(() => true)).toBe(false)
  })
  it('uses consent, form, initialize, preload in order and coalesces launch calls', async () => {
    const f = fixture()
    vi.mocked(f.sdk.consent).mockResolvedValue({ ...permitted, canRequestAds: false, required: true, formAvailable: true })
    const a = f.controller.bootstrap(), b = f.controller.bootstrap()
    expect(a).toBe(b)
    await Promise.all([a, b])
    expect(f.sdk.initialize).toHaveBeenCalledOnce()
    expect(f.sdk.load).toHaveBeenCalledOnce()
    expect(vi.mocked(f.sdk.consentForm).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(f.sdk.initialize).mock.invocationCallOrder[0])
    expect(f.controller.state).toBe('loaded')
  })
  it.each(['refused', 'refresh error', 'form error'])('never interprets %s as permission', async reason => {
    const f = fixture()
    if (reason === 'refused') vi.mocked(f.sdk.consent).mockResolvedValue({ ...permitted, canRequestAds: false })
    if (reason === 'refresh error') vi.mocked(f.sdk.consent).mockRejectedValue(new Error('offline'))
    if (reason === 'form error') {
      vi.mocked(f.sdk.consent).mockResolvedValue({ ...permitted, required: true, formAvailable: true })
      vi.mocked(f.sdk.consentForm).mockRejectedValue(new Error('form failed'))
    }
    await f.controller.bootstrap()
    expect(f.sdk.initialize).not.toHaveBeenCalled()
    expect(f.sdk.load).not.toHaveBeenCalled()
  })
  it('does not open a consent form after navigation into a game', async () => {
    const f = fixture(), info = deferred<Consent>()
    vi.mocked(f.sdk.consent).mockReturnValue(info.promise)
    const boot = f.controller.bootstrap()
    await vi.waitFor(() => expect(f.sdk.consent).toHaveBeenCalled())
    f.setSafe(false)
    info.resolve({ ...permitted, required: true, formAvailable: true })
    await boot
    expect(f.sdk.consentForm).not.toHaveBeenCalled()
  })
  it('can initialize after a system consent prompt temporarily deactivates the app', async () => {
    const f = fixture(), form = deferred<Consent>()
    vi.mocked(f.sdk.consent).mockResolvedValue({ ...permitted, canRequestAds: false, required: true, formAvailable: true })
    vi.mocked(f.sdk.consentForm).mockReturnValue(form.promise)
    const boot = f.controller.bootstrap()
    await vi.waitFor(() => expect(f.sdk.consentForm).toHaveBeenCalled())
    f.controller.invalidate() // Cache invalidation is not consent revocation.
    form.resolve(permitted)
    await boot
    expect(f.sdk.initialize).toHaveBeenCalledOnce()
    expect(f.controller.state).toBe('loaded')
  })
  it('treats no fill as a skipped ad and can preload again', async () => {
    const f = fixture()
    vi.mocked(f.sdk.load).mockRejectedValueOnce(new Error('no fill'))
    await f.controller.bootstrap()
    expect(f.controller.state).toBe('failed')
    expect(await f.controller.showIfReady(() => true)).toBe(false)
    await f.controller.preload()
    expect(f.controller.state).toBe('loaded')
  })
  it('coalesces loads and discards a load that completes after purchase/restore', async () => {
    const f = fixture(), loaded = deferred<void>()
    vi.mocked(f.sdk.load).mockReturnValue(loaded.promise)
    const boot = f.controller.bootstrap()
    await vi.waitFor(() => expect(f.sdk.load).toHaveBeenCalledOnce())
    const a = f.controller.preload(), b = f.controller.preload()
    expect(a).toBe(b)
    f.setFree(false)
    loaded.resolve()
    await Promise.all([boot, a, b])
    expect(f.controller.state).toBe('idle')
    expect(await f.controller.showIfReady(() => true)).toBe(false)
    expect(f.sdk.show).not.toHaveBeenCalled()
  })
  it('rejects cached ads after entitlement change or cache expiry', async () => {
    const f = fixture()
    await f.controller.bootstrap()
    f.setFree(false)
    expect(await f.controller.showIfReady(() => true)).toBe(false)
    f.setFree(true)
    await f.controller.preload()
    f.age()
    expect(await f.controller.showIfReady(() => true)).toBe(false)
  })
  it('rechecks entitlement after async presenter preparation', async () => {
    const f = fixture(), registered = deferred<{ remove(): Promise<void> }>()
    await f.controller.bootstrap()
    vi.mocked(f.sdk.listen).mockReturnValueOnce(registered.promise)
    const showing = f.controller.showIfReady(() => true)
    await vi.waitFor(() => expect(f.sdk.listen).toHaveBeenCalled())
    f.setFree(false)
    registered.resolve({ remove: f.remove })
    expect(await showing).toBe(false)
    expect(f.sdk.show).not.toHaveBeenCalled()
    expect(f.remove).toHaveBeenCalledTimes(3)
  })
  it.each(['TV/mirroring', 'navigation', 'background'])('rejects presentation on %s after preload', async reason => {
    const f = fixture()
    await f.controller.bootstrap()
    if (reason === 'TV/mirroring') f.setPhone(false)
    if (reason === 'background') f.setVisible(false)
    expect(await f.controller.showIfReady(() => reason !== 'navigation')).toBe(false)
    expect(f.sdk.show).not.toHaveBeenCalled()
  })
  it('keeps a presentation lock through dismissal and removes per-ad listeners', async () => {
    const f = fixture()
    await f.controller.bootstrap()
    const a = f.controller.showIfReady(() => true), b = f.controller.showIfReady(() => true)
    expect(await a).toBe(true)
    expect(await b).toBe(false)
    expect(await f.controller.showIfReady(() => true)).toBe(false)
    f.callbacks.get('dismissed')!()
    expect(f.controller.state).toBe('dismissed')
    expect(f.remove).toHaveBeenCalledTimes(3)
    await f.controller.preload()
    expect(await f.controller.showIfReady(() => true)).toBe(true)
  })
  it('cleans up after a show failure', async () => {
    const f = fixture()
    await f.controller.bootstrap()
    vi.mocked(f.sdk.show).mockRejectedValue(new Error('presenter unavailable'))
    expect(await f.controller.showIfReady(() => true)).toBe(false)
    expect(f.controller.state).toBe('failed')
    expect(f.remove).toHaveBeenCalledTimes(3)
  })
  it('invalidates cached permission while privacy choices are open and after refusal', async () => {
    const f = fixture(), form = deferred<void>()
    await f.controller.bootstrap()
    vi.mocked(f.sdk.privacyForm).mockReturnValue(form.promise)
    vi.mocked(f.sdk.consent).mockResolvedValue({ ...permitted, canRequestAds: false })
    const operation = f.controller.privacyChoices()
    expect(await f.controller.showIfReady(() => true)).toBe(false)
    form.resolve()
    expect(await operation).toBe(true)
    await f.controller.preload()
    expect(await f.controller.showIfReady(() => true)).toBe(false)
  })
  it('fails closed when privacy choices fail and disposes listeners', async () => {
    const f = fixture()
    await f.controller.bootstrap()
    vi.mocked(f.sdk.privacyForm).mockRejectedValue(new Error('offline'))
    expect(await f.controller.privacyChoices()).toBe(false)
    expect(await f.controller.showIfReady(() => true)).toBe(false)
    f.controller.dispose()
    expect(f.controller.state).toBe('idle')
  })
})
