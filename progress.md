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
