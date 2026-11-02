# Native advertising — development configuration

Approved 2 November 2026. No live ads or production monetization have been enabled.

## Placement and ownership

One native interstitial may follow a completed multiplayer session (Classic, Career, Head-to-Head, Higher / Lower) or ten-round online Classic practice. Final results remain readable for three seconds first. Attempts are at least three minutes apart across all modes, persisted on-device. A placement is consumed even if skipped. Daily, the website, the shared `/[roomId]/game` TV route, offline fallback, joining, settings, consent and error flows have no placements.

`lib/ads/completion.ts` owns session observation, deduplication, cancellation and the frequency cap. `hooks/useGameCompletion.ts` requires observing an active session before final results; opening restored results cannot qualify. `lib/ads/controller.ts` owns consent, initialization, preloading, cache expiry, listeners and the presentation lock. An unready ad is skipped, not shown after it eventually loads.

Generated `lib/playam-monetization.ts` is unchanged. Its product eligibility and completed-results policy gate delivery; its web delivery flag is not repurposed as native approval.

## Current IDs (Google demo configuration)

| Platform | Native application ID (`~`) | Interstitial unit (`/`) |
| --- | --- | --- |
| iOS | `ca-app-pub-3940256099942544~1458002511` | `ca-app-pub-3940256099942544/4411468910` |
| Android | `ca-app-pub-3940256099942544~3347511713` | `ca-app-pub-3940256099942544/1033173712` |

Native app IDs live in iOS Info.plist and Android `res/values/strings.xml`; units live in `lib/ads/native.ts`. The unit IDs are deliberately hardcoded demo units: setting an environment variable cannot accidentally turn on live ads. Requests use `npa: true`. Do not set the plugin's `isTesting` override: installed 8.2.1 uses an Android interstitial sample ID for that override on iOS. Explicit Google demo units are already test ads.

Plugin pinned to `@capacitor-community/admob` 8.2.1 with Capacitor 8.6.0. Its iOS package pins Google Mobile Ads 13.11.0 and UMP 3.1.x; Android uses Ads 25.4.x and UMP 4.0.0. Native configuration was regenerated using Capacitor sync.

## Consent and privacy

The first safe app home/privacy surface refreshes UMP once per webview launch, presents a required form, then initializes/preloads only if the SDK reports `canRequestAds`. Errors fail closed, including invalidating a cached ad. No extra ATT request is made: configure UMP to own any IDFA/ATT message. Do not reset a real user's consent to test a form.

When UMP requires privacy choices, the entry appears under About on `/app` and in `/privacy`. Opening choices invalidates the cache immediately. After changes, SDK permission is refreshed before more requests. Website visitors and older shells never invoke the SDK.

**Demo app IDs do not provide your app's configured UMP messages.** The iOS simulator displayed Google's generic Publisher Test Ads consent form with the sample app ID. A missing message or consent error deliberately produces no ads. To exercise consent/form/privacy-choice behavior on a device, register your real iOS/Android apps in AdMob, use their app IDs while keeping the demo unit IDs, publish the appropriate UMP test messages, and register the physical test device. Use UMP debug geography only for a registered test device; no forced geography ships here.

The privacy policy now describes the native SDK separately from web advertising. This alone does not complete store disclosures or legal review.

## Entitlements and presentation

There is no purchase provider/storefront. `lib/ads/entitlement.ts` exposes `unknown`, `free` and `ad-free`. The current product has no paid entitlements and starts `free`. Before adding billing, publish `unknown` before hydration and use only verified purchase/restore results to publish `free` or `ad-free`. Never store an unverified paid flag. Updates invalidate loading/loaded ads, and eligibility is rechecked immediately before show. The current bridge cannot dismiss an interstitial that was already presented before purchase; purchases must not run underneath full-screen ads.

Both plugins must be present: `AdMob` and the app's `AdPresentation`. Missing plugins fail closed. iOS explicitly assigns AppDelegate.window to the interactive phone scene; the guard checks window identity, foreground/key-window state, existing native presentations, screen capture and external screens. Android checks the activity/default display, foreground window focus and recording state. All external-display configurations currently suppress ads, including dedicated TV output and plain mirroring. Android recording detection requires API 35, so Android 14 and below skip ads. This is intentionally conservative; it does not change the minimum Android version for gameplay.

No TV feature or review prompt system was added. Backgrounding invalidates cached/preparing ads. Every native ad presentation installs its own dismissal/failure/show listeners and removes them after completion or error.

## Before earning revenue

1. Register both apps and separate interstitial units in your AdMob account. Replace the native app IDs first, retain demo units for device QA, then replace units only for the authorized production release. Rebuild/sync the shell for app-ID/native changes and deploy matching web code for delivery changes.
2. Configure UMP Privacy & messaging for the actual audience/regions, including applicable European and US messages and IDFA/ATT orchestration. Review age/audience flags and store declarations against the actual target audience; a general ad content rating is not a child-directed treatment determination.
3. Validate Google's current SKAdNetwork buyer IDs before release (the current iOS quick-start list is included), SDK privacy manifests in the archive, App Store privacy details, Play Data safety, advertising-ID/contains-ads declarations and required app-ads.txt publisher record. Do not invent publisher IDs or claim a finished compliance review.
4. Test real native test ads and UMP outcomes on iPhone, iPad and Android 15+: all four room modes and ten-round practice, repeated final results, rapid rematch/navigation, no fill/offline, consent required/refused/error, privacy choices, entitlement changes before/after preload, background/resume, and external display/mirroring/recording. Verify gameplay is still usable after each failure. Never click a live ad to verify this integration.
5. Keep the test units until those checks pass and production activation is separately authorized.

Official references checked 2 November 2026:

- [Plugin consent](https://github.com/capacitor-community/admob/blob/main/docs/consent.md)
- [iOS interstitial placement](https://developers.google.com/admob/ios/interstitial)
- [iOS setup and SKAdNetwork list](https://developers.google.com/admob/ios/quick-start)
- [iOS test units](https://developers.google.com/admob/ios/test-ads)
- [Android UMP](https://developers.google.com/admob/android/privacy)
- [Android recording detection](https://developer.android.com/about/versions/15/features#screen-recording-detection)
- [App Store SDK data disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure)
- [Google Play SDK data disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure)

## Verification on 2 November 2026

- All 105 automated tests pass (60 Vitest, 45 Node), including 43 new ad lifecycle/coordinator tests. TypeScript check and native Vite build/Capacitor sync pass.
- iOS simulator build succeeds with Google Mobile Ads 13.11.0 and UMP 3.1.0; plugin and app presenter guard compile. The phone guard returned `allowed: true`, UMP reported consent required with `canRequestAds: false`, and its real Publisher Test Ads consent form opened over the Play screen. No SDK initialization or ad load ran ahead of that consent gate. The form remains for manual simulator interaction; the available UI automation could not connect to the Simulator application.
- A full ten-round browser practice game, final results, replay and return home work without native-plugin errors or ad requests.
- Automated tests exercise every eligible mode's completed break, restored/duplicate/revisited results, cancellation, no fill, consent refusal/failure, privacy choices, entitlement races, stale cache, foreground and mocked TV/mirroring guards. These are mocked adapter tests, not proof of real ad presentation or a physical TV scene.
- Android build is blocked by the absent Java runtime/Android SDK. Actual native interstitial display/dismissal, physical-device UMP outcomes, a multi-scene/external-display presenter, Android recording behavior and per-mode native gameplay remain release QA items. No live ads were loaded or clicked, and no release was deployed.
