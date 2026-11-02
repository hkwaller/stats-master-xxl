import { Capacitor, registerPlugin } from '@capacitor/core'
import { hasNativePlugin } from '../native'
import { monetizationConfig } from '../playam-monetization'
import { AdController, type AdSdk } from './controller'
import { CompletionCoordinator } from './completion'
import { getAdEntitlement, subscribeAdEntitlement } from './entitlement'

// DEVELOPMENT CONFIGURATION ONLY. These public demo units cannot earn revenue.
// Keep isTesting unset: plugin 8.2.1's iOS testing override selects an Android ID.
export const TEST_INTERSTITIALS = {
  ios: 'ca-app-pub-3940256099942544/4411468910',
  android: 'ca-app-pub-3940256099942544/1033173712',
} as const
const Presentation = registerPlugin<{ context(): Promise<{ allowed: boolean }> }>('AdPresentation')
export function nativeAdsSupported() {
  return monetizationConfig['stats-master'].adsAllowed && ['ios', 'android'].includes(Capacitor.getPlatform()) && hasNativePlugin('AdMob') && hasNativePlugin('AdPresentation')
}
let nativeForeground = true
export function setNativeAdsActive(active: boolean) {
  nativeForeground = active
  if (!active) nativeAds.invalidate()
}
const visible = () => nativeForeground && typeof document !== 'undefined' && document.visibilityState === 'visible'
const consentSafe = () => typeof location !== 'undefined' && ['/app', '/privacy'].includes(location.pathname)
  && !document.querySelector('dialog[open], [role="dialog"], [aria-busy="true"]')
async function sdk(): Promise<AdSdk> {
  const { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, MaxAdContentRating } = await import('@capacitor-community/admob')
  const mapConsent = (info: Awaited<ReturnType<typeof AdMob.requestConsentInfo>>) => ({
    canRequestAds: info.canRequestAds === true,
    required: info.status === AdmobConsentStatus.REQUIRED,
    formAvailable: info.isConsentFormAvailable === true,
    privacyRequired: info.privacyOptionsRequirementStatus === 'REQUIRED',
  })
  const adId = TEST_INTERSTITIALS[Capacitor.getPlatform() as keyof typeof TEST_INTERSTITIALS]
  return {
    consent: async () => mapConsent(await AdMob.requestConsentInfo()),
    consentForm: async () => mapConsent(await AdMob.showConsentForm()),
    privacyForm: () => AdMob.showPrivacyOptionsForm(),
    initialize: () => AdMob.initialize({ maxAdContentRating: MaxAdContentRating.General }),
    load: async () => { await AdMob.prepareInterstitial({ adId, npa: true }) },
    show: () => AdMob.showInterstitial({ adId }),
    listen: (event, callback) => {
      switch (event) {
        case 'dismissed': return AdMob.addListener(InterstitialAdPluginEvents.Dismissed, callback)
        case 'failed': return AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, callback)
        case 'showed': return AdMob.addListener(InterstitialAdPluginEvents.Showed, callback)
      }
    },
  }
}
export const nativeAds = new AdController({
  supported: nativeAdsSupported,
  free: () => getAdEntitlement() === 'free',
  visible,
  consentSafe,
  phoneReady: async () => { try { return nativeAdsSupported() && (await Presentation.context()).allowed } catch { return false } },
  sdk,
  now: Date.now,
})
subscribeAdEntitlement(() => {
  nativeAds.invalidatePermission()
  if (getAdEntitlement() === 'free' && consentSafe()) void nativeAds.bootstrap()
})
const LEDGER_KEY = 'stats-master:native-ad-breaks:v1'
export const gameCompletion = new CompletionCoordinator({
  now: Date.now,
  read: () => {
    try {
      const value = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? 'null')
      if (Array.isArray(value?.seen) && value.seen.every((s: unknown) => typeof s === 'string') && Number.isFinite(value.lastAttempt)) return value
    } catch { /* SSR or unavailable storage: in-memory ledger still prevents duplicates. */ }
    return { seen: [], lastAttempt: 0 }
  },
  write: value => { try { localStorage.setItem(LEDGER_KEY, JSON.stringify(value)) } catch { /* Optional storage. */ } },
  preload: () => nativeAds.preload(),
  show: current => nativeAds.showIfReady(current),
  visible,
  route: () => typeof location !== 'undefined' ? location.pathname : '',
})
