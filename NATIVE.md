# Stats Master native

App: **Stats Master** · iOS/Android ID: **app.playam.statsmaster**.

## Run

```sh
npm ci
npm run native:sync       # builds local assets before syncing both platforms
npm run native:ios        # opens ios/App/Stats Master.xcworkspace
npm run native:android    # requires Android Studio / SDK / Java
```

Capacitor/core/platforms are 8.6.0; all plugins use major 8. Current requirements were checked against the [Capacitor environment guide](https://capacitorjs.com/docs/getting-started/environment-setup): Node 22+, Xcode 26+, Android Studio/SDK 36 and Java 21. iOS deployment target is 15; Android min SDK is 24. No signing team or credentials are configured.

For local iOS development, run Next.js and the PartyServer Worker, then:

```sh
NATIVE_DEV=1 CAP_DEV_SERVER_URL=http://127.0.0.1:3000 npm run native:sync
# A physical device needs a reachable LAN origin; Android emulator uses 10.0.2.2.
# Always restore before archiving:
npm run native:sync
```

Both Xcode Release builds and Android preReleaseBuild validate the production origin, /app startup path and disabled cleartext. A development sync is intentionally rejected for release. `npm run native:assets` regenerates branded icon/splash images; it needs the installed `sharp` module supplied by Next.js. No camera, microphone, location or tracking permissions are requested.

To avoid interfering with an existing Next development server, QA can build/start separately:

```sh
NEXT_BUILD_DIR=.next-native-qa npm run build
NEXT_BUILD_DIR=.next-native-qa npm run start -- --port 3002
```

## Architecture and deployment

The shell loads **https://statsmaster.playam.app/app**. `server.url` is the origin and `server.appStartPath` is `/app`: including `/app` in the server origin would cause iOS room navigation to open outside the app. The site remains at `/`; native visits to `/` return to `/app`. The custom UA marker selects a server-rendered hydration gate, so native guest Preferences restore before room components mount. Browser HTML remains fully rendered. The existing server is already dynamic through authentication; the marker must never be used as authentication or authorization.

**Deploy this repository's web changes before distributing the shell.** Production must serve `/app`, `/app/practice`, `/api/health`, the native helpers and existing game routes. Next.js actions, Clerk, Supabase and the deployed PartyServer Worker remain required for rooms and the daily challenge. The health endpoint proves only that the web app responds, not that every dependency is healthy. No production deployment was performed in this task.

This remote loading architecture is a deliberate fit for the existing server-backed game. Capacitor documents `server.url` primarily for live reload; treat remote runtime reliance and store acceptance as explicit release considerations. Remote deployments do not bypass store review requirements. Review [Capacitor configuration](https://capacitorjs.com/docs/config), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), and current Google Play policies before submission.

No wildcard navigation allowlist, universal links or custom callback scheme has been enabled. Same-origin navigation stays in the app; external sites open in the system browser. Join QR URLs currently open the web game. Verify production Clerk email/password and each enabled OAuth provider in the shell; external OAuth return links require deliberate Clerk/domain/associated-domain configuration and device verification before claiming support. Do not add arbitrary auth hosts to the bridge navigation allowlist.

## Offline and native behavior

`native/offline` builds to ignored `native/www`. All fonts, styles and the 2,234-season Classic snapshot are bundled locally; clean clones need no Supabase credentials to build it. A local `/app` startup sentinel is included because Capacitor iOS checks it even when using a remote server. `server.errorPath=offline.html` provides the fallback. No CDN is needed offline.

The offline landing page offers ten-round **Classic practice**, with four-choice generation and the exact answer/scoring helpers used by online rooms. Practice scores are in memory only and never change daily history or room scores. Career, Head-to-Head, Higher / Lower, multiplayer rooms, accounts and authoritative daily challenges need the network; they are not presented as offline modes. See `native/offline/README.md` for data/font provenance.

Retry checks the exact configured origin's JSON health endpoint with a five-second timeout and shows failure feedback. Automatic checks run on online/resume/visibility, throttle to 30 seconds, and never interrupt practice. Android error pages lack the Capacitor bridge, so practice and browser lifecycle events work independently of plugins. Native haptics are optional: explicit selections, answer locks/buzzes, daily results and practice results; no timer/render feedback.

Only guest ID/name is mirrored to Preferences; no auth credentials, authoritative daily scores or entitlements. iOS declares the UserDefaults privacy reason CA92.1. Local/native web origins have separate localStorage. Native keyboard resizes the viewport; CSS owns safe-area padding once. The iOS controller enables history swipe navigation. Android Back returns through history, then minimizes from home where supported.

## Verification

Confirmed on November 2, 2026:

- Production Next.js build, Next/Worker TypeScript checks, and 62 automated tests (17 Vitest + 45 Node) pass. New checks validate shared Classic scoring and four distinct choices for every bundled season.
- Offline bundle builds and both platform syncs succeed; generated release config contains only the production origin, `/app`, and `cleartext: false`.
- Named Xcode workspace lists the **Stats Master** scheme. Debug and Release builds succeed for iPhone 18 Pro / iOS 27 simulator, signing disabled.
- Native online `/app` launch against the isolated local Next server renders the new home. Native cold launch against `https://offline-test.invalid` renders the real bundled fallback with local fonts and safe areas. The startup path failure found by this check was fixed and retested.
- Browser tests: ten offline rounds, duplicate-tap lock, replay/reset, retry failure, controlled successful health retry, online/visibility signals without interrupting play, Host/Join navigation, website homepage, and widths 320/390/768/1280. No runtime errors in the completed flow.
- Release guard rejects the temporary offline-test origin; production configuration restored afterward.

Android build/device evidence is **outstanding**: no Java runtime or Android SDK was found on this Mac. Native interaction testing for focused inputs/keyboard, background/resume, long room sessions, actual haptics and completed production auth is also outstanding; browser viewport/lifecycle checks and native launch screenshots are not substitutes for real-device testing. Production retry cannot succeed until the new web routes are deployed.

## Before stores

1. Deploy the matching Next.js/Worker configuration; verify rooms and `/api/health` at the production origin.
2. Select your Apple signing team, register the bundle ID and App Store Connect record, choose version/build numbers, and archive the named scheme. Create the matching Google Play record and signing/upload key; build/test the AAB with Java/SDK installed.
3. Verify production Clerk login/logout, enabled OAuth providers and account deletion; configure and verify any required callback/universal links. Include reviewer access if needed.
4. Test a physical iPhone and Android: cold offline launch, complete local practice, reconnect, background/resume, room host/join, keyboard on small screens, haptics, safe areas and accessibility. Include iPad/landscape coverage before advertising tablet support.
5. Finish privacy/data-safety forms for Clerk, Supabase and existing PostHog telemetry, age/content ratings, screenshots, support/privacy URLs, and current Apple/Google store policy checks. No ads, purchases or TV features were added.
