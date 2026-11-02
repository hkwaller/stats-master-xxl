Original prompt: Lets migrate here as well — apply the supplied PartyServer migration playbook.

Implemented a single PartyServer backend for Stats Master. Existing game hooks use
an optimistic shared reducer, with server snapshots authoritative and random
elimination waiting for the server. All 28 game mutations were ported to JSON
draft rules. The reducer binds identity and enforces phase/mode guards, including
Change Settings directly from the final board. Added HMAC room tickets, fresh
tickets on reconnect, session/round stale-message checks, online player projection,
chunked atomic persistence, and a 24-hour expiration alarm. Updated environment
examples/local secrets, launch scripts, docs, privacy, and existing regressions.
No native wrapper exists in this repository.

Verified:
- 59 automated tests: 45 existing Node regressions and 14 Vitest tests.
- Next.js and Worker TypeScript checks; optimized production build.
- Worker deployment dry run: approximately 145 KiB gzip.
- Real socket games in classic, career, head-to-head, and higher/lower modes:
  scoring, pause/resume, reconnect, rematch, and stale-session rejection.
- Forged and wrong-room tickets refused before socket connection.
- A 279 KB career room persisted and restored after an actual Worker restart.
- Full five-round browser game against the real question database, independent
  localhost/127.0.0.1 host and phone identities, pause/resume, host/phone reloads,
  scoring, and rematch. No browser runtime errors. Screenshots inspected.
- No references to the previous backend remain outside git history and caches.
- Local secret and Wrangler state files are ignored by git.

Remaining rollout steps: deploy the Cloudflare Worker, set the matching Cloudflare
and Vercel secrets/host variables, then verify a preview on a real phone (including
lock screen and app switching) before production. See party/README.md.
Production resources were not changed. Existing untracked .codex/ and .cursor/
files were left untouched. Temporary browser artifacts are in /tmp/stats-browser/.

Follow-up: removed the web payment integration, including its SDK, checkout,
billing portal, webhook, pricing route, user-entitlement hook/helpers, room
paid-status fields, and local/example environment variables. Updated privacy,
terms, and monetization documentation. In-app purchases remain a future task;
web advertising stays disabled. Verified all 59 tests, Worker type checking,
and a successful production build after the removal.

Native follow-up (November 2, 2026): user requested game-native and approved
app.playam.statsmaster plus a dedicated /app landing page. Added Capacitor 8
shells for iOS/Android, native helpers/guest Preferences hydration, haptics,
/app home, shared Classic practice, and a bundled styled offline fallback with
2,234 local NHL seasons and local licensed fonts. Created Stats Master workspace,
target/product/shared scheme, icon/splash assets, and release-origin guards.
The earlier statement that no wrapper exists is now superseded.

Verified 62 automated tests (17 Vitest + 45 Node), Next/Worker type checks,
production Next builds, offline bundle and both platform syncs, iOS Debug and
Release simulator builds (iPhone 18 Pro / iOS 27), and native offline cold launch.
Browser flow covers 10 offline rounds, replay, retry failure/success (controlled
health response), no mid-game auto navigation, Host/Join, web homepage, 320–1280px,
native UA SSR hydration and keyboard-sized input. No browser runtime errors.
The existing dev server shares .next, so final QA built separately using
NEXT_BUILD_DIR=.next-native-qa and localhost:3002 (Clerk's local proxy expects
localhost). Temporary tests/captures/logs use /tmp/stats-*.

Release configuration restored to https://statsmaster.playam.app + /app;
production web deployment, signing/stores, Android Java/SDK/build/device tests,
actual haptics, native keyboard/resume/room sessions and production auth remain.
See NATIVE.md. No deployments, credentials, monetization or TV changes were made.
